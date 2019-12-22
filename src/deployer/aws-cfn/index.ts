import createAndExecuteChangeSets from "./createAndExecuteChangeSet";
import bundleAsZipsToS3 from "./bundleAsZipToS3";
import { DeployerProps } from "./types";
import preflight from './preflight';

export { preflight };

export const deploy =  async (props: DeployerProps) => {
    const bundledArtifacts = await bundleAsZipsToS3(props);
    const deployedArtifacts = createAndExecuteChangeSets(bundledArtifacts, props);
    return deployedArtifacts;
};