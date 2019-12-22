import { CloudFormation, config, S3 } from 'aws-sdk';
import { BundledArtifact, DeployerProps, Stack } from './types';
import { error, info } from '../../logger';
import { readFileSync } from 'fs';

const cfn = new CloudFormation();
const s3 = new S3();

const fetchChangeSetType = async (cfn: CloudFormation, stack: Stack): Promise<string> => {
    info(`Determining change set type required for stack ${stack.name}`);
    return await cfn.describeStacks({ StackName: stack.name }).promise()
        .then(() => 'UPDATE')
        .catch(() => 'CREATE');
};

const getS3URL = (bucket: string, key: string) => `http://s3.${config.region}.amazonaws.com/${bucket}/${key}`;

const convertToParametersArray = (parameterMap: { [key: string]: string }) => Object.entries(parameterMap)
    .map(([ ParameterKey, ParameterValue ]) => ({ ParameterKey, ParameterValue }));

const getArtifactParameters = (bundledArtifacts: BundledArtifact[], ) => bundledArtifacts.reduce(
    (artifactParameters, { name, bucket, key }) => ({
        ...artifactParameters,
        [`${name}ArtifactBucket`]: bucket,
        [`${name}ArtifactKey`]: key,
    }),
    {},
);

interface CreateChangeSetProps {
    bucket: string,
    ChangeSetName: string,
    ChangeSetType: string,
    key: string,
}
const createChangeSet = async (bundledArtifacts: BundledArtifact[], stack: Stack, props: CreateChangeSetProps) => {
    const { name: StackName } = stack;
    const { bucket, ChangeSetName, ChangeSetType, key } = props;

    info(`Creating Change Set "${ChangeSetName}"`);
    try {
        await cfn.createChangeSet({
            StackName,
            TemplateURL: getS3URL(bucket, key),
            Capabilities: stack.capabilities,
            Parameters: convertToParametersArray({
                ...getArtifactParameters(bundledArtifacts.filter(({ name }) => stack.artifactNamesConsumed.includes(name))),
                ...stack.parameters,
            }),
            ChangeSetName,
            ChangeSetType,
        }).promise()
        await cfn.waitFor('changeSetCreateComplete', { ChangeSetName, StackName }).promise();
    } catch ({ message: errorMessage }) {
        if (errorMessage) error(errorMessage);

        const changeSetState = await cfn.describeChangeSet({ ChangeSetName, StackName }).promise()
            .catch(() => null);
        if (!changeSetState) throw new Error('The change set was not created. This could be due to configuration errors for which artifacts a stack consumes. It also may be a bug in cloud-deploy');
        
        const { Status, StatusReason } = changeSetState;
        throw new Error(`Unexpected ChangeSet status: ${Status}: ${StatusReason}`);
    }
        
};

const createAndExecuteChangeSet = async (bundledArtifacts: BundledArtifact[], stack: Stack, props: DeployerProps) => {
    const { name: StackName } = stack;
    const ChangeSetName = `${stack.name}-changeset-${props.executionID}`;
    const ChangeSetType = await fetchChangeSetType(cfn, stack);
    const key = `${stack.name}-${props.executionID}.template`;

    info(`Preparing to deploy stack ${StackName} via operation ${ChangeSetType}`);

    await s3.putObject({
        Body: readFileSync(stack.templatePath,'utf-8'),
        Bucket: props.bucket,
        Key: key,
    }).promise();

    await createChangeSet(bundledArtifacts, stack, {
        bucket: props.bucket,
        ChangeSetName,
        ChangeSetType,
        key,
    });
    
    info(`Executing Change Set "${ChangeSetName}"`);
    await cfn.executeChangeSet({ ChangeSetName, StackName }).promise();
};

const createAndExecuteChangeSets = async (bundledArtifacts: BundledArtifact[], props: DeployerProps) => {
    const { stacks } = props;
    await Promise.all(
        stacks.map(stack => createAndExecuteChangeSet(bundledArtifacts, stack, props)),
    );
    return bundledArtifacts;
};

export default createAndExecuteChangeSets;