const { existsSync, readFileSync } = require('fs');
const { promisify } = require('util');
const chalk = require('chalk');
const dotenv = require('dotenv');
const path = require('path');
const drivers = {
    system: {
        name: '',
        driver: require('../drivers/syncdb/system'),
    },
    js: {
        name: '',
        driver: require('../drivers/syncdb/js'),
    },
};

createLocalConfig = (env, opts) => {
    const { save, pathBase } = opts;

    // create config from dotenv with defaults
    return Object.assign({
        save,
        pathBase,
        dbServer: env.DB_SERVER,
        dbUser: env.DB_USER,
        dbPort: env.DB_PORT,
        dbPassword: env.DB_PASSWORD,
        dbDatabase: env.DB_DATABASE,
    });
}

createRemoteConfig = (env, opts) => {
    const { pathBase, remoteName } = opts;
    const { PATH_REMOTES_CONFIG = './config/remotes.json' } = env;

    const pathConfigRemote = path.join(pathBase, PATH_REMOTES_CONFIG);

    // init remote config
    if (!existsSync(pathConfigRemote)) {
        console.error('No servers configured', pathConfigRemote);
        process.exit();
    }

    configRemotes = JSON.parse(readFileSync(pathConfigRemote));

    const configRemote = configRemotes[remoteName];

    if (!configRemote) {
        console.log(chalk.red('Chosen server does not exist'));
        return;
    }

    // add functions to remote config
    configRemote.storagePath = (file = '') => `${configRemote.pathBackupDirectory}/${file}`;

    return configRemote;
}

module.exports = function syncDb(remoteName = 'default', {
    save = false,
    sshDriverOption = 'system',
    pathBase = process.cwd(),
}) {
    const opts = { save, pathBase, remoteName };

    // create env object
    const pathDotEnv = path.join(pathBase, './.env');

    if (!existsSync(pathDotEnv)) {
        console.log(chalk.red('Dotenv path does not exist', pathDotEnv));
        process.exit();
    }

    const env = dotenv.parse(readFileSync(pathDotEnv));

    // create config objects for local and remote
    configLocal = createLocalConfig(env, opts);
    configRemote = createRemoteConfig(env, opts);

    // run driver
    try {
        drivers[sshDriverOption].driver.execute(configLocal, configRemote);
    } catch (e) {
        console.log(e);
    }

    console.log(chalk.green('complete'));
};
