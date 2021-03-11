import { request } from '@octokit/request';
import {
    RequestHeaders
} from "@octokit/types";
import yaml from 'js-yaml';
import fs from 'fs';
import yargs from 'yargs';
import { Repos } from './types/IRepo';
import "reflect-metadata";
import { ConnectionOptions, createConnection } from 'typeorm';
import { IssueTable, RepoTable } from './database';
import { RepoManager } from './repo_manager';

const yarg = yargs
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
    .help()
    .alias('help', 'h');

const argv = yarg.argv;

if (!argv.config || !argv.database) {
    process.exit(0);
}

let token: string = '';

interface YamlConfig {
    token: string;
}

try {
    const config = yaml.load(fs.readFileSync(`${argv.config}`, 'utf-8')) as YamlConfig;
    token = config.token;
} catch (e) {
    console.log(e);
    process.exit(-1);
}

// init database
const options: ConnectionOptions = {
    type: "sqlite",
    database: argv.database,
    entities: [RepoTable, IssueTable],
    logging: true,
    synchronize: true,
}

async function main() {
    const connection = await createConnection(options);

    const repoTable = connection.getRepository(RepoTable);
    const issueTable = connection.getRepository(IssueTable);

    const headers: RequestHeaders = {
        authorization: `token ${token}`
    }

    async function repo() {
        let index: number = 0;
        let repos: Repos = [];
        // 失败以后记录到失败表,并记录重试次数
        for (; ;) {
            const response = await request('GET /orgs/{org}/repos', {
                headers,
                org: 'linuxdeepin',
                page: index
            });

            if (response.status !== 200) {
                continue;
            }

            const tmp: Repos = response.data;

            if (tmp.length === 0) {
                break;
            }

            repos = repos.concat(tmp)
            index += 1;
        }

        for (let repo of repos) {
            const value = new RepoTable();
            value.repo = repo.name;
            value.forks = repo.forks_count;
            value.open_issues = repo.open_issues_count;
            value.watchers = repo.watchers_count;
            await repoTable.manager.save(value);

            const repo_manager = new RepoManager({
                name: repo.name,
                request,
                headers
            });

            repo_manager.issue().then(async issues => {
                let values: Array<IssueTable> = [];
                // 查找到已有的，去掉id相同的
                for (let issue of issues) {
                    let result = await issueTable.find({
                        where: {
                            repo: repo.name,
                            number: issue.number
                        }
                    });

                    console.log(`${repo} ${result.length}`);

                    let value = new IssueTable();
                    Object.assign(value, issue);

                    if (result.length < 1) {
                        await issueTable.manager.save(value);
                    }
                }
            });

            repo_manager.pull().then(async pulls => {
                pulls.forEach(pull => {

                });
            });
        }
    }

    await repo();
}

// main().catch(error);

(async () => {
    await main();
})();
