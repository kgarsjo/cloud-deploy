import { Bundler, Deployer } from './aws-cfn/types';
import awsCFNStrategy from './aws-cfn';

interface CloudDeployStrategy {
    bundle: Bundler,
    deploy: Deployer,
}

export type CloudDeployer = (CloudDeployerProps) => Promise<void>;

const strategies: { [key: string]: CloudDeployStrategy } = {
    'aws-cfn': awsCFNStrategy,
};

const createDeployer = (strategy: CloudDeployStrategy) => async (props) => {
    const { bundle,deploy } = strategy;
    const bundledArtifacts = await bundle(props);
    await deploy(bundledArtifacts, props);
};

export const getAvailableStrategies = (): string[] => Object.keys(strategies);

export const getDeployerForStrategy = (strategyName: string): CloudDeployer => {
    const strategy = strategies[strategyName];
    return createDeployer(strategy);
};