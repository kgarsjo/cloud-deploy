import * as Ajv from 'ajv';
import configSchema from './configSchema';
import { success } from '../../logger';

import { config,  STS } from 'aws-sdk';
import { DeployerProps } from './types';

const sts = new STS();
const validate = new Ajv().compile(configSchema);

const preflight = async (props: DeployerProps) => {
    if (!await validate(props)) {
        throw new Error(`Missing or invalid configuration: ${JSON.stringify(validate.errors)}`);
    }

    if (!config.region) {
        throw new Error('An AWS region must be specified\nEither set an AWS_REGION environment variable or set the AWS_SDK_LOAD_CONFIG enviornment variable to true to load regions from your AWS Configuration');
    }

    try {
        const identity = await sts.getCallerIdentity().promise();
        success(`Targeting AWS account: ${identity.Account}`);
        success(`Targeting AWS region: ${sts.config.region}`)
        success(`Using credentials: ${identity.Arn}`);
    } catch (e) {
        throw new Error(`${e.message}\nEither set up your AWS credentials file or pass in credentials via environment variables`);
    }

    success(`Artifacts to package: ${JSON.stringify(props.artifacts.map(({ name }) => name))}`);
    success(`Stacks to deploy: ${JSON.stringify(props.stacks.map(({ name }) => name))}`);
    return props;
};


export default preflight;