import { Artifact, BundledArtifact, DeployerProps } from "./types";
import * as  glob from 'glob';
import { info } from '../../logger';
import { isAbsolute, join } from 'path';
import * as JSZip from 'jszip';
import { lstatSync, readFileSync } from 'fs';
import { S3 } from 'aws-sdk';

const s3 = new S3();

const getCwd = (path?: string): string => {
    if (!path) return process.cwd();
    return isAbsolute(path) ? path : join(process.cwd(), path);
}

const createBundleZip = async ({ patterns, root }: Artifact): Promise<Buffer> => {
    const cwd = getCwd(root);
    return await patterns.flatMap(pattern => glob.sync(pattern, { cwd }))
        .map(artifactPath => ({ artifactPath, filePath: join(cwd, artifactPath) }))
        .filter(({ filePath }) => lstatSync(filePath).isFile())
        .reduce(
            (zip, { artifactPath, filePath }) => zip.file(artifactPath, readFileSync(filePath)),
            new JSZip(),
        ).generateAsync({ type: 'nodebuffer' })
};

const bundleArtifactAsZipToS3 = async (artifact: Artifact, props: DeployerProps): Promise<BundledArtifact> => {
    info(`Bundling artifact named ${artifact.name}`);
    const { bucket, executionID } = props;
    const zipBuffer = await createBundleZip(artifact);

    const key = `${artifact.name}-${executionID}.zip`;
    info(`Uploading artifact named ${artifact.name} to s3://${bucket}/${key}`);
    await s3.putObject({ Body: zipBuffer, Bucket:bucket, Key: key }).promise();
    return { ...artifact, bucket, key };
}

const bundleAsZipsToS3 = async (props: DeployerProps): Promise<BundledArtifact[]> => await Promise.all(
    props.artifacts.map(
        artifact => bundleArtifactAsZipToS3(artifact, props)
    ),
);

export default bundleAsZipsToS3;