import * as awsCFN from './aws-cfn';
import { error } from '../logger';

type Deploy = (...args: any[]) => Promise<any>;
export interface CloudDeployer {
    preflight: (...args: any[]) => Promise<any>,
    deploy: Deploy,
}

const deployers: { [key: string]: CloudDeployer } = {
    'aws-cfn': awsCFN,
};

const logAndExit = (e: Error) => {
    error(e);
    process.exit(1);
};

export const getAvailableDeployers = (): string[] => Object.keys(deployers);

export const getDeployerForStrategy = (strategyName: string): Deploy => async (...args: any[]) =>{
    const { deploy, preflight } = deployers[strategyName];
    return await preflight(...args)
        .then(() => deploy(...args))
        .catch(logAndExit);
};