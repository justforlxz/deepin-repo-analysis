import yargs from "yargs";

export default yargs
    .option('config', {
        alias: 'c',
        description: 'load config yaml',
        type: 'string',
        requiresArg: true
    })
    .option('database', {
        alias: 'db',
        description: 'load database',
        type: 'string',
        requiresArg: true
    })
    .option('download', {
        alias: 'd',
        description: 'set download type',
        type: 'string',
        default: 'all',
        choices: ['all', 'failed', 'successd'],
        requiresArg: false
    })
    .help()
    .alias('help', 'h');
