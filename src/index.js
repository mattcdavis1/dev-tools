#! /usr/bin/env node
const program = require("commander");
const syncDb = require('./commands/syncDb');

program
    .version(1.1)
    .command('syncdb [remote]')
    .option('-l, --local-engine <engine>', 'type of local environment. defaults to "docker"')
    .option('-s, --save', 'save database dump on local and remote environments')
    .description('sync local database with a remote server')
    .action(syncDb);

program.parse(process.argv);

if (!program.args.length) program.help();
