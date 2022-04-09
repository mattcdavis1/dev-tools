#! /usr/bin/env node
const pkg = require('../package');
const program = require('commander');
const syncDb = require('./commands/SyncDb');

program
    .version(pkg.version)
    .command('syncdb [remote]')
    .option('-s, --save', 'whether save database dump locally. defaults to "false"')
    .option('--project-path <projectPath>', 'path to project root. defaults to current working directory')
    .description('sync local database with a remote server')
    .action(syncDb);

program.parse(process.argv);

if (!program.args.length) program.help();
