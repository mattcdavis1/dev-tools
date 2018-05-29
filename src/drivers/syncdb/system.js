const { execSync } = require('child_process');
const { createWriteStream } = require('fs');
const chalk = require('chalk');

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