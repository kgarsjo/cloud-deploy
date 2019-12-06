import bundleAsZipToS3 from "./bundleAsZipToS3";
import createAndExecuteChangeSets from "./createAndExecuteChangeSet";

export default {
    bundle: bundleAsZipToS3,
    deploy: createAndExecuteChangeSets,
};