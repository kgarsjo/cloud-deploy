import * as Ajv from 'ajv';
import configSchema from './configSchema';
import createAndExecuteChangeSets from "./createAndExecuteChangeSet";
import bundleAsZipsToS3 from "./bundleAsZipToS3";
import { DeployerProps } from "./types";

const validate = new Ajv().compile(configSchema);

export const preflight = async (props: any) => {
    if (!validate(props)) {
        throw new Error(`Missing or invalid configuration: ${JSON.stringify(validate.errors)}`);
    }
};

export const deploy =  async (props: DeployerProps) => {
    const bundledArtifacts = await bundleAsZipsToS3(props);
    const deployedArtifacts = createAndExecuteChangeSets(bundledArtifacts, props);
    return deployedArtifacts;
};