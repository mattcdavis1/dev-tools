const { Command } = require('@adonisjs/ace')

class SyncDb extends Command {
    static get signature () {
        return `
            syncdb
            {remote: name of remote server}
            {--save: save database dump on local and remote environments}
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
    }
}

module.exports = SyncDb