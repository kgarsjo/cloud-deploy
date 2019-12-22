export interface Artifact {
    name: string,
    patterns: string[],
}

export interface BundledArtifact extends Artifact {
    bucket: string,
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

export interface DeployerProps {
    artifacts: Artifact[],
    bucket: string,
    executionID: string,
    stacks: Stack[],
}