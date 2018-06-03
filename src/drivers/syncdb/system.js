// global requires
const { createWriteStream } = require('fs');
const { execSync } = require('child_process');
const chalk = require('chalk');

// vars
const SQL_DUMP_FILE_NAME = 'database_dump.sql';
const SQL_DUMP_FILE_NAME_ZIP = 'database_dump.sql.zip';

// functions
const localStoragePath = (file = '') => `./storage/${file}`;
const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
        const bufs = [];
        stream
            .on('close', () => resolve(Buffer.concat(bufs)))
            .on('error', reject)
            .on('data', d => bufs.push(d));
    });

class SystemSsh {
    execute(remoteConfig) {
        console.log(chalk.green('System SSH Driver Running'));


        console.log(chalk.yellow('Beginning remote dump...'));
    }

    debug(text) {
        console.log(chalk.yellow(text));
    }
}

module.exports = new SystemSsh;