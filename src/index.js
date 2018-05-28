const ace = require('@adonisjs/ace')

ace.addCommand(require('./commands/SyncDb'))

// Boot ace to execute commands
ace.wireUpWithCommander()
ace.invoke()