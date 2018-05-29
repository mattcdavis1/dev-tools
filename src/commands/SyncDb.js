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

const SSH_DRIVER_SYSTEM = 'system';
const SSH_DRIVER_JS = 'js';

const SQL_DUMP_FILE_NAME = 'database_dump.sql';
const SQL_DUMP_FILE_NAME_ZIP = 'database_dump.sql.zip';

const localStoragePath = (file = '') => `./storage/${file}`;

module.exports = function syncDb(remoteName = 'default', {
    localEngine = ENGINE_SYSTEM,
    save = false,
    sshDriverOption = SSH_DRIVER_SYSTEM,
    pathBase = process.cwd(),
    pathDotEnv = path.join(process.cwd(), './.env'),
}) {
    // init env vars
    if (!existsSync(pathDotEnv)) {
        console.log(chalk.red('Dotenv path does not exist', pathDotEnv));
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

    // init remote config
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

    const configRemote = configRemotes[remoteName];

    if (!configRemote) {
        console.log(chalk.red('Chosen server does not exist'));
        return;
    }

    // init ssh driver
    if (!['system', 'js'].includes(sshDriverOption)) {
        console.log(chalk.red("SSH Driver must be one of 'system' or 'js'"));
        process.exit();
    }

    const sshDriverMap = {
        system: SystemSsh,
        js: JsSsh,
    };

    const sshDriver = sshDriverMap[sshDriverOption];

    // add functions to remote config
    configRemote.storagePath = (file = '') => `${configRemote.pathBackupDirectory}/${file}`;

    // run driver
    try {
        sshDriver.execute(configRemote);
    } catch (e) {
        console.log(e);
    }

    console.log(chalk.green('complete'));
};
