const ace = require('@adonisjs/ace');

ace.addCommand(require('./commands/SyncDb'));
ace.onError(function (error, commandName) {
    console.log(`${commandName} reported ${error.message}`)
    process.exit(1)
});

// Boot ace to execute commands
ace.wireUpWithCommander();
ace.invoke();

process.exit();