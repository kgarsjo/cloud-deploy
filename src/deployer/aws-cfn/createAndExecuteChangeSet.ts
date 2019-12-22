import { CloudFormation, config, S3 } from 'aws-sdk';
import { BundledArtifact, DeployerProps, Stack } from './types';
import { info, success } from '../../logger';
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

const getArtifactParameters = (bundledArtifacts: BundledArtifact[], ) =>bundledArtifacts.reduce(
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
enum CreateChangeSetStatus {
    READY,
    NO_CHANGE,
}
const createChangeSet = async (bundledArtifacts: BundledArtifact[], stack: Stack, props: CreateChangeSetProps): Promise<CreateChangeSetStatus> => {
    const { name: StackName } = stack;
    const { bucket, ChangeSetName, ChangeSetType, key } = props;
    const Parameters = convertToParametersArray({
        ...getArtifactParameters(bundledArtifacts.filter(({ name }) => stack.artifactNamesConsumed.includes(name))),
        ...stack.parameters,
    });

    info(`Creating Change Set "${ChangeSetName}" with parameters:\n${JSON.stringify(Parameters)}`);
    try {
        await cfn.createChangeSet({
            StackName,
            TemplateURL: getS3URL(bucket, key),
            Capabilities: stack.capabilities,
            Parameters,
            ChangeSetName,
            ChangeSetType,
        }).promise()
        await cfn.waitFor('changeSetCreateComplete', { ChangeSetName, StackName }).promise();
        return CreateChangeSetStatus.READY;
    } catch ({ message: errorMessage }) {

        const changeSetState = await cfn.describeChangeSet({ ChangeSetName, StackName }).promise()
            .catch(() => null);
        if (!changeSetState) throw new Error(`The change set was not createddue to the following error: ${errorMessage}`);
        
        const { Status, StatusReason = '' } = changeSetState;
        if (StatusReason.includes('The submitted information didn\'t contain changes')) {
            success(`There are no changes for change set ${ChangeSetName}`);
            return CreateChangeSetStatus.NO_CHANGE;
        }
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

    const changeSetStatus = await createChangeSet(bundledArtifacts, stack, {
        bucket: props.bucket,
        ChangeSetName,
        ChangeSetType,
        key,
    });
    
    if (changeSetStatus === CreateChangeSetStatus.READY) {
        info(`Executing Change Set "${ChangeSetName}"`);
        await cfn.executeChangeSet({ ChangeSetName, StackName }).promise();
    }
};

const createAndExecuteChangeSets = async (bundledArtifacts: BundledArtifact[], props: DeployerProps) => {
    const { stacks } = props;
    await Promise.all(
        stacks.map(stack => createAndExecuteChangeSet(bundledArtifacts, stack, props)),
    );
    return bundledArtifacts;
};

export default createAndExecuteChangeSets;