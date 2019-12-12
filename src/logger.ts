import * as chalk from 'chalk';
import { compose } from './utils';

const prefixLogWith = (prefix: string) => (logMessage: any) =>  `[${prefix}]\t${logMessage}`;

export const info = compose(console.log, chalk.blue, prefixLogWith('INFO'));
export const error = compose(console.log, chalk.red, prefixLogWith('ERROR'));
export const success = compose(console.log, chalk.green);
export const warn = compose(console.log, chalk.yellow, prefixLogWith('WARN'));