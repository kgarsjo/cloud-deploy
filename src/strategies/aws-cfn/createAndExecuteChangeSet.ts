import { CloudFormation, S3 } from 'aws-sdk';
import { BundledArtifact, DeployerProps, Stack } from './types';
import { readFileSync } from 'fs';

const s3 = new S3();

const fetchChangeSetType = async (cfn: CloudFormation, stack: Stack): Promise<string> => {
    console.log(`Determining change set type for stack ${stack.name}`);
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
    console.log(`Creating and executing change set for stack named ${stack.name}`);

    const key = `${stack.name}-${props.executionID}.template`;
    await s3.putObject({
        Body: readFileSync(stack.templatePath,'utf-8'),
        Bucket: props.bucket,
        Key: key,
    }).promise();
    
    const changeSetName = `${stack.name}-changeset-${props.executionID}`;
    await cfn.createChangeSet({
        StackName: stack.name,
        TemplateURL: getS3URL(props.bucket, key, props.region),
        Capabilities: stack.capabilities,
        Parameters: convertToParametersArray({
            ...getArtifactParameters(bundledArtifacts.filter(({ name }) => stack.artifactNamesConsumed.includes(name))),
            ...stack.parameters,
        }),
        ChangeSetName: changeSetName,
        ChangeSetType: await fetchChangeSetType(cfn, stack),
    }).promise();

    await cfn.executeChangeSet({
        ChangeSetName: changeSetName,
        StackName: stack.name,
    }).promise();
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