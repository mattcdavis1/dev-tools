const dotenv = require('dotenv');
const { Command } = require('@adonisjs/ace');
const { promisify } = require('util');
const { createWriteStream, existsSync, readFileSync } = require('fs');
const { Client } = require('ssh2');
const { execSync } = require('child_process');
const path = require('path');

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

const storagePath = (file = '') => './storage/' + file;

class SyncDb extends Command {
    static get signature () {
        return `
            syncdb
            {remote: name of remote server}
            {--save: save database dump on local and remote environments}
            {--localEngine=${ENGINE_SYSTEM}: which local engine to use}
        `;
    }

    static get description () {
        return 'Sync Remote Database to Local Database';
    }

    async handle (args, options) {
        const { remote } = args;
        const { save } = options;

        console.log(`Remote is: ${remote}`);
        console.log(`Save is: ${save}`);

        const {
            DB_SERVER,
            DB_USER,
            DB_PORT,
            DB_PASSWORD,
            DB_DATABASE,
            CONFIG_PATH = './config/remotes.js'
        } = dotenv.parse(readFileSync(path.join(process.cwd(), './.env')));

        const configPath = path.join(process.cwd(), CONFIG_PATH);

        if (!existsSync(configPath)) {
            console.error('No servers configured');
            return;
        }

        const config = JSON.parse(path.join(process.cwd(), CONFIG_PATH));
        const remote = config[remoteName];

        if (!remote) {
            console.error('Chosen server does not exist');
            return;
        }

        const remoteStoragePath = (file = '') => `${remote.pathBackupDirectory}/${file}`;

        console.log('Beginning remote dump...');

        const conn = new Client();
        conn.on('ready', async () => {
            console.log('Remote connection ready');

            const remoteExec = promisify(conn.exec.bind(conn));

            const sftp = await new Promise((resolve, reject) =>
                conn.sftp((err, sftp) => err ? reject(err) : resolve(sftp))
            );

            // scoping remote db connection
            {
                const envBuffer = await streamToBuffer(sftp.createReadStream(`${remote.root}/.env`));
                const {
                    DB_SERVER,
                    DB_USER,
                    DB_PASSWORD,
                    DB_DATABASE,
                    DB_PORT
                } = dotenv.parse(envBuffer);

                await remoteExec(`mysqldump -h ${DB_SERVER} -u ${DB_USER} -p"${DB_PASSWORD}" -P ${DB_PORT} ${DB_DATABASE} > ${remoteStoragePath(SQL_DUMP_FILE_NAME)}`)
                    .then(streamToBuffer);

            }

            await remoteExec(`zip -j ${remoteStoragePath(SQL_DUMP_FILE_NAME_ZIP)} ${remoteStoragePath(SQL_DUMP_FILE_NAME)}`)
                .then(streamToBuffer);

            console.log('Remote dump completed');
            console.log('Downloading remote file...');

            await new Promise((resolve) =>
                sftp.createReadStream(remoteStoragePath(SQL_DUMP_FILE_NAME_ZIP))
                    .on('close', resolve)
                    .pipe(createWriteStream(storagePath(SQL_DUMP_FILE_NAME_ZIP)))
            );

            console.log('Remote download completed');

            // delete remote files
            await new Promise((resolve) => sftp.unlink(remoteStoragePath(SQL_DUMP_FILE_NAME_ZIP), resolve));

            if (!save) {
                await new Promise((resolve) => sftp.unlink(remoteStoragePath(SQL_DUMP_FILE_NAME), resolve));
            }

            console.log('Remote file deleted');

            // close tunnel
            conn.end();

            execSync(`unzip -o ${storagePath(SQL_DUMP_FILE_NAME_ZIP)} -d ${storagePath()}`);

            const dbConnection = `mysql -u ${DB_USER} --password="${DB_PASSWORD}" ${DB_DATABASE}`;

            let importDatabaseCommand;

            switch (localEngine) {
                case ENGINE_DOCKER:
                    importDatabaseCommand = `docker-compose exec -T ${DB_SERVER} bash -c "${dbConnection} < ${dockerStorage(SQL_DUMP_FILE_NAME)}"`;
                    break;
                default:
                    importDatabaseCommand = `${dbConnection} -P ${DB_PORT} < ${storagePath(SQL_DUMP_FILE_NAME)}`;
                    return;
            }

            execSync(importDatabaseCommand);

            console.log('Local dump complete');

            // delete sql files
            execSync(`rm ${storagePath(SQL_DUMP_FILE_NAME_ZIP)}`);

            if (!save) {
                execSync(`rm ${storagePath(SQL_DUMP_FILE_NAME)}`);
            }

            console.log('Local files deleted');
        }).connect(remote);
    }
}

module.exports = SyncDb