export interface Artifact {
    name: string,
    root: string,
    patterns: string[],
}

export interface BundledArtifact extends Artifact {
    bucketName: string,
    key: string,
}

export interface DeployedArtifact extends Artifact {}

export interface Stack {
    artifactNamesConsumed: string[],
    capabilities: string[],
    name: string,
    parameters: { [key: string]: string },
    templatePath: string,
}

export type BucketDescription = {
    fromExport?: string,
    name?: string,
}

export interface DeployerProps {
    artifacts: Artifact[],
    bucket: BucketDescription,
    executionID: string,
    stacks: Stack[],
}