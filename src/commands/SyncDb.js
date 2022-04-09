const {
    existsSync,
    readFileSync
  } = require('fs');
  const {
    promisify
  } = require('util');
  const chalk = require('chalk');
  const dotenv = require('dotenv');
  const path = require('path');
  const drivers = {
    system: {
      name: '',
      driver: require('../drivers/syncdb/system'),
    }
  };

  createLocalConfig = (env, opts) => {
    const {
      save,
      projectPath
    } = opts;

    const HOST = env.DB_SERVER ? env.DB_SERVER : env.DB_HOST;
    const USERNAME = env.DB_USER ? env.DB_USER : env.DB_USERNAME;
    const DATABASE = env.DB_DATABASE ? env.DB_DATABASE : env.DB_NAME;
    const PASSWORD = env.DB_PASSWORD ? env.DB_PASSWORD : env.DB_PASS;

    // create config from dotenv with defaults
    return Object.assign({
      save,
      projectPath,
      dbServer: HOST,
      dbUser: USERNAME,
      dbPort: env.DB_PORT,
      dbPassword: PASSWORD,
      dbDatabase: DATABASE,
      backupPath: env.BACKUP_PATH,
    });
  }

  createRemoteConfig = (env, opts) => {
    const {
      projectPath,
      remoteName
    } = opts;
    const {
      PATH_REMOTES_CONFIG = './config/remotes.json'
    } = env;
    const pathConfigRemote = path.join(projectPath, PATH_REMOTES_CONFIG);

    // init remote config
    if (!existsSync(pathConfigRemote)) {
      console.error('No servers configured', pathConfigRemote);
      process.exit();
    }

    configRemotes = JSON.parse(readFileSync(pathConfigRemote));

    const configRemote = configRemotes[remoteName];

    if (!configRemote) {
      console.log(chalk.red('Chosen server does not exist'), configRemotes);
      return;
    }

    // add functions to remote config
    configRemote.storagePath = (file = '') => `${configRemote.pathBackupDirectory}/${file}`;

    return configRemote;
  }

  module.exports = function syncDb(remoteName = 'prod', {
    save = false,
    sshDriverOption = 'system',
    projectPath = process.cwd(),
  }) {
    const opts = {
      save,
      projectPath,
      remoteName
    };

    // create env object
    const pathDotEnv = path.join(projectPath, './.env');

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
      const driver = new drivers[sshDriverOption].driver(configLocal, configRemote);
      driver.execute();
    } catch (e) {
      console.log(e);
    }

    console.log(chalk.green('complete'));
  };
