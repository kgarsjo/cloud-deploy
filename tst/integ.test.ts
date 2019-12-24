import { execSync } from 'child_process';
import * as lambdaDeployConfig from './lambda/deploy.json';
import { CloudFormation, Lambda } from 'aws-sdk';

jest.setTimeout(600e3);

const region = 'us-west-2';

const cfn = new CloudFormation({ region });
const lambda = new Lambda({ region });

describe('Integration tests', () => {
    describe('bucket-from-export', () => {
        beforeEach(() => {
            execSync(`AWS_REGION=${region} node ./dist/index.js -c tst/bucket-from-export/deploy.json`, {
                stdio: 'inherit',
            });
        });

        it('should deploy a callable lambda', async () => {
            const { Payload: result } = await lambda.invoke({
                FunctionName: 'TestLambda',
            }).promise();
            expect(JSON.parse(result as string)).toEqual({ status: 'ok' });
        });

        afterEach(async () => {
           await Promise.all(lambdaDeployConfig.stacks
                .map((stack: any) => (stack.name as string))
                .map((StackName: string) => cfn.deleteStack({ StackName }).promise()
                    .then(() => cfn.waitFor('stackDeleteComplete', { StackName }))
                    .catch(e => console.warn(e))
           ))
        });
    });

    describe('lambda', () => {
        beforeEach(() => {
            execSync(`AWS_REGION=${region} node ./dist/index.js -c tst/lambda/deploy.json`, {
                stdio: 'inherit',
            });
        });

        it('should deploy two callable lambdas', async () => {
            const { Payload: firstResult } = await lambda.invoke({
                FunctionName: 'TestLambdaWithRoot',
            }).promise();

            const { Payload: secondResult } = await lambda.invoke({
                FunctionName: 'TestLambdaWithNoRoot',
            }).promise();

            expect(JSON.parse(firstResult as string)).toEqual({ status: 'ok' });
            expect(JSON.parse(secondResult as string)).toEqual({ status: 'ok' });
        });

        afterEach(async () => {
           await Promise.all(lambdaDeployConfig.stacks
                .map((stack: any) => (stack.name as string))
                .map((StackName: string) => cfn.deleteStack({ StackName }).promise()
                    .then(() => cfn.waitFor('stackDeleteComplete', { StackName }))
                    .catch(e => console.warn(e))
           ))
        });
    });

    describe('unknown-bucket-export', () => {
        it('should fail due to unknown bucket export name by the stack', () => {
            try {
                execSync(`AWS_REGION=${region} node ./dist/index.js -c tst/unknown-bucket-export/deploy.json`, {
                    stdio: 'inherit',
                });
            } catch (e) {
                return;
            }
            fail('Expected the invalid export name to result in command failure');
        });
    });

    describe('unknown-artifacts-consumed', () => {
        it('should fail due to unknown artifacts consumed by the stack', () => {
            try {
                execSync(`AWS_REGION=${region} node ./dist/index.js -c tst/unknown-artifacts-consumed/deploy.json --dry-run`, {
                    stdio: 'inherit',
                });
            } catch (e) {
                return;
            }
            fail('Expected the config to result in command failure');
        });
    });
});