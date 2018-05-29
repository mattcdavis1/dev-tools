#! /usr/bin/env node
const pkg = require('../package');
const program = require('commander');
const syncDb = require('./commands/SyncDb');

program
    .version(pkg.version)
    .command('syncdb [remote]')
    .option('-l, --local-engine <engine>', 'type of local environment. defaults to "docker"')
    .option('-s, --save', 'save database dump on local and remote environments')
    .option('--path-base <pathBase>', 'path to project root')
    .option('--path-dot-env <pathDotEnv>', 'path to dotenv file')
    .description('sync local database with a remote server')
    .action(syncDb);

program.parse(process.argv);

if (!program.args.length) program.help();
