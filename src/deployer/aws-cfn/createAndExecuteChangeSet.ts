import { CloudFormation, S3 } from 'aws-sdk';
import { BundledArtifact, DeployerProps, Stack } from './types';
import { info } from '../../logger';
import { readFileSync } from 'fs';

const s3 = new S3();

const fetchChangeSetType = async (cfn: CloudFormation, stack: Stack): Promise<string> => {
    info(`Determining change set type for stack ${stack.name}`);
    return await cfn.describeStacks({ StackName: stack.name }).promise()
        .then(() => 'UPDATE')
        .catch(() => 'CREATE');
};

const getS3URL = (bucket: string, key: string, region: string) => `http://s3.${region}.amazonaws.com/${bucket}/${key}`;

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

const createAndExecuteChangeSet = async (cfn: CloudFormation, bundledArtifacts: BundledArtifact[], stack: Stack, props: DeployerProps) => {
    const { name: StackName } = stack;

    const key = `${stack.name}-${props.executionID}.template`;
    await s3.putObject({
        Body: readFileSync(stack.templatePath,'utf-8'),
        Bucket: props.bucket,
        Key: key,
    }).promise();
    
    const ChangeSetName = `${stack.name}-changeset-${props.executionID}`;
    info(`Creating Change Set "${ChangeSetName}"`);
    await cfn.createChangeSet({
        StackName,
        TemplateURL: getS3URL(props.bucket, key, props.region),
        Capabilities: stack.capabilities,
        Parameters: convertToParametersArray({
            ...getArtifactParameters(bundledArtifacts.filter(({ name }) => stack.artifactNamesConsumed.includes(name))),
            ...stack.parameters,
        }),
        ChangeSetName,
        ChangeSetType: await fetchChangeSetType(cfn, stack),
    }).promise()
        .then(() => cfn.waitFor('changeSetCreateComplete', { ChangeSetName, StackName }).promise())
        .catch(() => cfn.describeChangeSet({ ChangeSetName, StackName })
            .promise()
            .then(({ Status, StatusReason }) => {
                throw new Error(`Unexpected ChangeSet status: ${Status}: ${StatusReason}`);
            }));

    
    info(`Executing Change Set "${ChangeSetName}"`);
    await cfn.executeChangeSet({ ChangeSetName, StackName }).promise();
};

const createAndExecuteChangeSets = async (bundledArtifacts: BundledArtifact[], props: DeployerProps) => {
    const { region, stacks } = props;
    const cfn = new CloudFormation({ region });
    await Promise.all(
        stacks.map(stack => createAndExecuteChangeSet(cfn, bundledArtifacts, stack, props)),
    );
    return bundledArtifacts;
};

export default createAndExecuteChangeSets;