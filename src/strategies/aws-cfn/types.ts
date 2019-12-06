export interface Artifact {
    name: string,
    patterns: string[],
}

export interface BundledArtifact extends Artifact {
    bucket: string,
    key: string,
};

export interface BundlerProps {
    artifacts: Artifact[],
    bucket: string,
    executionID: string,
}

export interface Stack {
    artifactNamesConsumed: string[],
    capabilities: string[],
    name: string,
    parameters: { [key: string]: string },
    templatePath: string,
}

export interface DeployedArtifact extends Artifact {}

export interface DeployerProps {
    bucket: string,
    executionID: string,
    region: string,
    stacks: Stack[],
}

export type Bundler = (BundlerProps) => Promise<BundledArtifact[]>;

export type Deployer = (bundledArtifacts: BundledArtifact[], deployerProps: DeployerProps) => Promise<DeployedArtifact[]>;