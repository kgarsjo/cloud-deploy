import { Artifact, BundledArtifact, DeployerProps } from "./types";
import * as  glob from 'glob';
import * as JSZip from 'jszip';
import { lstatSync, readFileSync } from 'fs';
import { S3 } from 'aws-sdk';

const s3 = new S3();

const createBundleZip = async ({ patterns }: Artifact): Promise<Buffer> => (
    await patterns.flatMap(pattern => glob.sync(pattern))
        .filter(filePath => lstatSync(filePath).isFile())
        .reduce(
            (zip, filePath) => zip.file(filePath, readFileSync(filePath)),
            new JSZip(),
        )
        .generateAsync({ type: 'nodebuffer' })
);

const bundleArtifactAsZipToS3 = async (artifact: Artifact, props: DeployerProps): Promise<BundledArtifact> => {
    console.log(`Bundling artifact named ${artifact.name}`);
    const { bucket, executionID } = props;
    const zipBuffer = await createBundleZip(artifact);

    const key = `${artifact.name}-${executionID}.zip`;
    console.log(`Uploading artifact named ${artifact.name} to s3://${bucket}/${key}`);
    await s3.putObject({ Body: zipBuffer, Bucket:bucket, Key: key }).promise();
    return { ...artifact, bucket, key };
}

const bundleAsZipsToS3 = async (props: DeployerProps): Promise<BundledArtifact[]> => await Promise.all(
    props.artifacts.map(
        artifact => bundleArtifactAsZipToS3(artifact, props)
    ),
);

export default bundleAsZipsToS3;