const { Command } = require('@adonisjs/ace');
const { existsSync, readFileSync } = require('fs');
const { promisify } = require('util');
const chalk = require('chalk');
const dotenv = require('dotenv');
const JsSsh = require('../drivers/syncdb/js');
const path = require('path');
const SystemSsh = require('../drivers/syncdb/system');

const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
        const bufs = [];
        stream
            .on('close', () => resolve(Buffer.concat(bufs)))
            .on('error', reject)
            .on('data', d => bufs.push(d));
    });

const ENGINE_DOCKER = 'docker';
const ENGINE_SYSTEM = 'system';

const SQL_DUMP_FILE_NAME = 'database_dump.sql';
const SQL_DUMP_FILE_NAME_ZIP = 'database_dump.sql.zip';

const localStoragePath = (file = '') => `./storage/${file}`;

class SyncDb extends Command {
    static get signature () {
        return `
            syncdb
            { remote: name of remote server }
            { --save: save database dump on local and remote environments }
            { --pathBase=@value: path to project root }
            { --pathDotEnv=@value: path to dot env file }
            { --localEngine=@value: which local engine to use }
            { --sshDriver=@value: use 'system' or 'js' driver (defaults to 'system') }
        `;
    }

    static get description () {
        return 'Sync Remote Database to Local Database';
    }

    async handle (args, options) {
        const { remote } = args;
        const { save } = options;
        let { localEngine, pathBase, pathDotEnv, sshDriverOption } = options;

        localEngine = localEngine||ENGINE_SYSTEM;
        sshDriverOption = sshDriverOption||'system';
        pathBase = pathBase||process.cwd();
        pathDotEnv = pathDotEnv||path.join(pathBase, './.env');

        if (!['system', 'js'].includes(sshDriverOption)) {
            console.log(chalk.red("SSH Driver must be one of 'system' or 'js'"));
            process.exit();
        }

        const sshDriverMap = {
            system: SystemSsh,
            js: JsSsh,
        };
        // SystemSsh.debug();
        const sshDriver = sshDriverMap[sshDriverOption];

        if (!existsSync(pathDotEnv)) {
            console.log(chalk.red('Dotenv path does not exits'));
            process.exit();
        }

        let configEnv = {};

        try {
            configEnv = dotenv.parse(readFileSync(pathDotEnv))
        } catch (e) {
            console.log(e);
        };

        const {
            DB_SERVER,
            DB_USER,
            DB_PORT,
            DB_PASSWORD,
            DB_DATABASE,
            PATH_REMOTES = './config/remotes.json'
        } = configEnv;

        const pathConfigRemote = path.join(pathBase, PATH_REMOTES);

        if (!existsSync(pathConfigRemote)) {
            console.error('No servers configured', pathConfigRemote);
            process.exit();
        }

        let configRemotes = {};

        try {
            configRemotes = JSON.parse(readFileSync(pathConfigRemote));
        } catch (e) {
            console.log(e);
        }

        const configRemote = configRemotes[remote];

        if (!remote) {
            console.log(chalk.red('Chosen server does not exist'));
            return;
        }

        configRemote.storagePath = (file = '') => `${configRemote.pathBackupDirectory}/${file}`;
        try {
            sshDriver.execute(configRemote);
        } catch (e) {
            console.log(e);
        }

        console.log(chalk.green('complete'));
    }
}

module.exports = SyncDb;