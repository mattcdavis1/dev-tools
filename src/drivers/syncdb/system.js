// global requires
const {
    createWriteStream,
    mkDirSync,
    existsSync
  } = require('fs');
  const {
    execSync,
    spawnSync
  } = require('child_process');
  const chalk = require('chalk');
  const dotenv = require('dotenv');
  const path = require('path');

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
    constructor(local, remote) {
      this.local = local;
      this.remote = remote;
    }

    execute() {
      console.log(chalk.yellow('Parsing Remote Env File...'));
      const local = this.local;
      const remote = this.remote;

      // get remote env
      const {
        stdout
      } = this.execRemote(`cat ${remote.pathDotEnv}`, {
        stdio: 'pipe'
      });
      const {
        DB_DATABASE,
        DB_NAME,
        DB_PASSWORD,
        DB_PASS,
        DB_PORT,
        DB_SERVER,
        DB_HOST,
        DB_USER,
        DB_USERNAME,
        IS_MARIA_SANDBOX,
        MYSQL_DUMP_PATH = '/usr/bin/mysqldump',
      } = dotenv.parse(stdout.toString('utf8'));

      const DATABASE = DB_DATABASE ? DB_DATABASE : DB_NAME;
      const PASSWORD = DB_PASSWORD ? DB_PASSWORD : DB_PASS;
      const USERNAME = DB_USER ? DB_USER : DB_USERNAME;
      const HOST = DB_SERVER ? DB_SERVER : DB_HOST;

      // execute remote mysqldump
      const remoteSqlDumpPath = path.join(remote.pathBackupDirectory, SQL_DUMP_FILE_NAME);
      const remoteSqlDumpZipPath = path.join(remote.pathBackupDirectory, SQL_DUMP_FILE_NAME_ZIP);
      let ignoreTables = new String();
      if (Array.isArray(remote.ignoreTables)) {
        remote.ignoreTables.forEach((table) => {
          ignoreTables = ignoreTables.concat(` --ignore-table=${table} `)
        })
      }

      let options = new String();
      if (Array.isArray(remote.options)) {
        remote.options.forEach((option) => {
          options = options.concat(` ${option} `)
        })
      }

      const dumpRemoteSqlCommand = `${MYSQL_DUMP_PATH} -h ${HOST} -u ${USERNAME} --password='${PASSWORD}' ${ignoreTables} ${options} -P ${DB_PORT} ${DATABASE} > ${remoteSqlDumpPath}`;
      // console.log(dumpRemoteSqlCommand);
      // process.exit();
      const zipRemoteSqlCommand = `zip -j ${remoteSqlDumpZipPath} ${remoteSqlDumpPath}`;
      const deleteRemoteSqlCommand = `rm ${remoteSqlDumpPath};`;

      console.log(chalk.yellow('Beginning Remote Dump...'));

      this.execRemote(`${dumpRemoteSqlCommand}; ${zipRemoteSqlCommand}; ${deleteRemoteSqlCommand}`);

      console.log(chalk.green('Remote Dump Complete'));

      // download remote sql dump zip file
      console.log(chalk.yellow('Downloading Remote SQL Dump...'));

      const backupDirectoryPath = this.local.backupPath ? this.local.backupPath : path.join(this.local.projectPath, 'storage/backups/databases/');

      if (!existsSync(backupDirectoryPath)) {
        this.execLocal(`mkdir -p ${backupDirectoryPath}`);
      }

      const localSqlDumpPath = path.join(backupDirectoryPath, SQL_DUMP_FILE_NAME);
      const localSqlDumpZipPath = path.join(backupDirectoryPath, SQL_DUMP_FILE_NAME_ZIP);

      const downloadZipCommand = `scp ${remote.host}:${remoteSqlDumpZipPath} ${localSqlDumpZipPath}`;
      this.execLocal(downloadZipCommand);

      console.log(chalk.green('SQL Zip File Download Complete'));

      // unzip and import sql dump
      const unzipZipCommand = `unzip -o ${localSqlDumpZipPath} -d ${backupDirectoryPath}`;
      const deleteLocalZipCommand = `rm ${localSqlDumpZipPath}`;

      this.execLocal(`${unzipZipCommand};`);
      this.execLocal(`${deleteLocalZipCommand}`);

      console.log(chalk.green('SQL Zip File Unzipped and Deleted'));

      if (IS_MARIA_SANDBOX === 'true') {
        // remove the first line for newer MariaDB dump
        this.execLocal(`sed -i '' '1d' ${localSqlDumpPath}`);
      }

      const importMysqlCommand = `mysql -u ${local.dbUser} -h ${local.dbServer} -P ${local.dbPort} --password="${local.dbPassword}" ${local.dbDatabase} < ${localSqlDumpPath}`;
      const deleteLocalSqlCommand = `rm ${localSqlDumpPath};`;

      this.execLocal(`${importMysqlCommand}; ${deleteLocalSqlCommand}`);

      // delete remote zip file
      this.execRemote(`rm ${remoteSqlDumpZipPath};`);

      console.log(chalk.green('SyncDB Complete'));
    }


    execLocal(command, {
      stdio = 'inherit'
    } = {}) {
      const localCommand = spawnSync(command, {
        shell: true,
        stdio,
      });

      if (localCommand.error) {
        console.log(chalk.red(localCommand.error.message));
        process.exit();
      }

      return localCommand;
    }

    execRemote(command, {
      stdio = 'inherit'
    } = {}) {
      const host = this.remote.username ? `${this.remote.username}@${this.remote.host}` : this.remote.host;

      const sshCommand = spawnSync(`ssh ${host} -p ${this.remote.port} <<'EOF' \n ${command}\nEOF`, {
        shell: true,
        stdio,
      });

      if (sshCommand.error) {
        console.log(chalk.red(sshCommand.error.message));
        process.exit();
      }

      return sshCommand;
    };

    debug(text) {
      console.log(chalk.yellow(text));
    }
  }

  module.exports = SystemSsh;
