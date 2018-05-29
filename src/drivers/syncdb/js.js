const { Client } = require('ssh2');
const { execSync } = require('child_process');
const { createWriteStream } = require('fs');

class JsSsh {
    execute(remoteConfig) {
        const conn = new Client();

        console.log(chalk.green('JS SSH Driver Running'));

        conn.on('ready', async () => {
            console.log(chalk.yellow('Remote connection ready'));

            console.log(chalk.yellow('Beginning remote dump...'));

            // const remoteExec = promisify(conn.exec.bind(conn));

            // const sftp = await new Promise((resolve, reject) =>
            //     conn.sftp((err, sftp) => err ? reject(err) : resolve(sftp))
            // );

            // // scoping remote db connection
            // {
            //     const envBuffer = await streamToBuffer(sftp.createReadStream(`${remote.root}/.env`));
            //     const {
            //         DB_SERVER,
            //         DB_USER,
            //         DB_PASSWORD,
            //         DB_DATABASE,
            //         DB_PORT
            //     } = dotenv.parse(envBuffer);

            //     await remoteExec(`mysqldump -h ${DB_SERVER} -u ${DB_USER} -p"${DB_PASSWORD}" -P ${DB_PORT} ${DB_DATABASE} > ${remoteStoragePath(SQL_DUMP_FILE_NAME)}`)
            //         .then(streamToBuffer);

            // }

            // await remoteExec(`zip -j ${remoteStoragePath(SQL_DUMP_FILE_NAME_ZIP)} ${remoteStoragePath(SQL_DUMP_FILE_NAME)}`)
            //     .then(streamToBuffer);

            // console.log('Remote dump completed');
            // console.log('Downloading remote file...');

            // await new Promise((resolve) =>
            //     sftp.createReadStream(remoteStoragePath(SQL_DUMP_FILE_NAME_ZIP))
            //         .on('close', resolve)
            //         .pipe(createWriteStream(localStoragePath(SQL_DUMP_FILE_NAME_ZIP)))
            // );

            // console.log('Remote download completed');

            // // delete remote files
            // await new Promise((resolve) => sftp.unlink(remoteStoragePath(SQL_DUMP_FILE_NAME_ZIP), resolve));

            // if (!save) {
            //     await new Promise((resolve) => sftp.unlink(remoteStoragePath(SQL_DUMP_FILE_NAME), resolve));
            // }

            // console.log('Remote file deleted');

            // // close tunnel
            // conn.end();

            // execSync(`unzip -o ${localStoragePath(SQL_DUMP_FILE_NAME_ZIP)} -d ${localStoragePath()}`);

            // const dbConnection = `mysql -u ${DB_USER} --password="${DB_PASSWORD}" ${DB_DATABASE}`;

            // let importDatabaseCommand;

            // switch (localEngine) {
            //     case ENGINE_DOCKER:
            //         importDatabaseCommand = `docker-compose exec -T ${DB_SERVER} bash -c "${dbConnection} < ${dockerStorage(SQL_DUMP_FILE_NAME)}"`;
            //         break;
            //     default:
            //         importDatabaseCommand = `${dbConnection} -P ${DB_PORT} < ${localStoragePath(SQL_DUMP_FILE_NAME)}`;
            //         return;
            // }

            // execSync(importDatabaseCommand);

            // console.log('Local dump complete');

            // // delete sql files
            // execSync(`rm ${localStoragePath(SQL_DUMP_FILE_NAME_ZIP)}`);

            // if (!save) {
            //     execSync(`rm ${localStoragePath(SQL_DUMP_FILE_NAME)}`);
            // }

            console.log(chalk.yellow('Local files deleted'));
        }).connect(configRemote);
    }
};

module.exports = new JsSsh;