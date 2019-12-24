import { config, CloudFormation, S3 } from 'aws-sdk';
import { BucketDescription } from './types';
import { once } from '../../utils';
import { ListExportsOutput } from 'aws-sdk/clients/cloudformation';
import { info } from '../../logger';

export const cfn = new CloudFormation();
export const s3 = new S3();

const lookupExportValue = async (exportName: string): Promise<string> => {
    let nextToken;
    let foundExport;
    info(`Resolving export named ${exportName}`);
    do {
        const result: ListExportsOutput = await cfn.listExports({ NextToken: nextToken }).promise();
        nextToken = result.NextToken;
        const Exports = result.Exports || [];
        foundExport = Exports.find(({ Name }) => Name === exportName);
        if (foundExport) break;
    } while (nextToken);
    if (foundExport && foundExport.Value) return foundExport.Value as string;
    throw new Error(`Couldn\'t find export named "${exportName}" in region ${config.region}`);
};

export const getBucketName = once(async (props: BucketDescription): Promise<string> => {
    if (props.fromExport) return await lookupExportValue(props.fromExport);
    return props.name as string;
});

export const getS3URL = (bucket: string, key: string) => `http://s3.${config.region}.amazonaws.com/${bucket}/${key}`;
