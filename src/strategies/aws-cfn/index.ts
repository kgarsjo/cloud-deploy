import createAndExecuteChangeSets from "./createAndExecuteChangeSet";
import bundleAsZipsToS3 from "./bundleAsZipToS3";
import { DeployerProps } from "./types";

export default async (props: DeployerProps) => {
    const bundledArtifacts = await bundleAsZipsToS3(props);
    const deployedArtifacts = createAndExecuteChangeSets(bundledArtifacts, props);
    return deployedArtifacts;
};