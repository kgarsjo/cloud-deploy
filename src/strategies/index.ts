import awsCFNDeployer from './aws-cfn';

export type CloudDeployer = (...args: any[]) => Promise<any>;

const deployers: { [key: string]: CloudDeployer } = {
    'aws-cfn': awsCFNDeployer,
};

export const getAvailableDeployers = (): string[] => Object.keys(deployers);

export const getDeployerForStrategy = (strategyName: string): CloudDeployer => {
   return deployers[strategyName];
};