#!/usr/bin/env node

import { readFileSync } from 'fs';
import * as uuid from 'uuid';
import * as yargs from 'yargs';

import { getAvailableStrategies, getDeployerForStrategy } from './strategies';

const argv = yargs
    .options({
        config: {
            alias: 'c',
            config: true,
            configHandler: configPath => JSON.parse(readFileSync(configPath, 'utf-8')),
            default: './deploy.config.json'
        },
        strategy: {
            alias: 's',
            choices: getAvailableStrategies(),
            demand: true,
            describe: 'Which packaging and deployment strategy to use',
        },
    })
    .argv;

const deploy = getDeployerForStrategy(argv.strategy);
deploy({
    ...argv,
    executionID: uuid.v4(),
});