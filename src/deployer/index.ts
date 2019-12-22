import * as awsCFN from './aws-cfn';
import { error, warn } from '../logger';
import { noop } from '../utils';

type Deploy = (...args: any[]) => Promise<any>;
export interface CloudDeployer {
    preflight: (...args: any[]) => Promise<any>,
    deploy: Deploy,
}

const deployers: { [key: string]: CloudDeployer } = {
    'aws-cfn': awsCFN,
};

export const getAvailableDeployers = (): string[] => Object.keys(deployers);

export const getDeployerForStrategy = (strategyName: string, dryRun?: boolean): Deploy => async (props: any) => {
    const deployer = deployers[strategyName];
    const deploy = dryRun ? noop : deployer.deploy;
    const { preflight } = deployer;

    if (dryRun) warn('Dry-running: no deployment will be done');
    try {
        const vettedProps = await preflight(props);
        await deploy(vettedProps);
    } catch (e) { 
        error(e);
        process.exit(1);;
    }
};