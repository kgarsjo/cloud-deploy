import { Artifact, BundledArtifact, DeployerProps } from "./types";
import { getBucketName, s3 } from "./sdk";
import * as  glob from 'glob';
import { info } from '../../logger';
import { isAbsolute, join } from 'path';
import * as JSZip from 'jszip';
import { lstatSync, readFileSync } from 'fs';

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
    const bucketName = await getBucketName(bucket);
    const zipBuffer = await createBundleZip(artifact);

    const key = `${artifact.name}-${executionID}.zip`;
    info(`Uploading artifact named ${artifact.name} to s3://${bucketName}/${key}`);
    await s3.putObject({ Body: zipBuffer, Bucket: bucketName, Key: key }).promise();
    return { ...artifact, bucketName, key };
}

const bundleAsZipsToS3 = async (props: DeployerProps): Promise<BundledArtifact[]> => await Promise.all(
    props.artifacts.map(
        artifact => bundleArtifactAsZipToS3(artifact, props)
    ),
);

export default bundleAsZipsToS3;