// global requires
const { createWriteStream } = require('fs');
const { execSync, spawnSync } = require('child_process');
const chalk = require('chalk');
const dotenv = require('dotenv');

// vars
const SQL_DUMP_FILE_NAME = 'database_dump.sql';
const SQL_DUMP_FILE_NAME_ZIP = 'database_dump.sql.zip';
const LOCAL_BACKUP_DIRECTORY = 'backups/databases/';

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

        // get remote env
        const { stdout } = this.execRemote(`cat ${this.remote.pathDotEnv}`, { stdio: 'pipe' });
        const {
            DB_DATABASE,
            DB_PASSWORD,
            DB_PORT,
            DB_SERVER,
            DB_USER,
            MYSQL_DUMP_PATH = '/usr/bin/mysqldump',
            SSH_PORT,
        } = dotenv.parse(stdout.toString('utf8'));

        // execute remote mysqldump

        const remoteSqlDumpPath = `${this.remote.backupDirectory}/${SQL_DUMP_FILE_NAME}`;
        const remoteSqlDumpZipPath = `${this.remote.backupDirectory}/${SQL_DUMP_FILE_NAME_ZIP}`;

        const dumpSqlCommand = `${MYSQL_DUMP_PATH} -h ${DB_SERVER} -u ${DB_USER} -p"${DB_PASSWORD}" -P ${DB_PORT} ${DB_DATABASE} > ${remoteSqlDumpPath}`;
        const zipSqlCommand = `zip -j ${remoteSqlDumpZipPath} ${remoteSqlDumpPath}`;
        const rmSqlCommand = `rm ${remoteSqlDumpPath}`;

        console.log(chalk.yellow('Beginning Remote Dump...'));

        this.execRemote(`${dumpSqlCommand}; ${zipSqlCommand}; ${rmSqlCommand}`);

        const localSqlDumpPath = `${LOCAL_BACKUP_DIRECTORY}/${SQL_DUMP_FILE_NAME}`;
        const localSqlDumpZipPath = `${LOCAL_BACKUP_DIRECTORY}/${SQL_DUMP_FILE_NAME_ZIP}`;

        const downloadZipCommand = `scp ${this.remote.host}:${remoteSqlDumpZipPath} ${localSqlDumpZipPath}`;

        this.execLocal(downloadZipCommand);
    }

    execLocal(command, { stdio = 'inherit' }) {
        const localCommand = spawnSync(command, {
            shell: true,
            stdio: 'inherit',
        });

        if (localCommand.error) {
            console.log(chalk.red(localCommand.error.message));
            process.exit();
        }

        return localCommand;
    }

    execRemote(command, { stdio = 'inherit' }) {
        const host = this.remote.username ? `${this.remote.username}@${this.remote.host}` : this.remote.host;

        const sshCommand = spawnSync(`ssh ${host} -p ${this.remote.port} ${command}`, {
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