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
        let reposRec: string[] = []
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

            if (response.data.length === 0) {
                break;
            }

            const tmp: Repos = [];

            response.data.forEach(repo => {
                if (reposRec.find(v => v == repo.name) === undefined) {
                    reposRec.push(repo.name)
                    tmp.push(repo);
                }
            });

            repos = repos.concat(tmp)
            index += 1;
        }

        // 检查上次失败的
        let replyRepos: Repos = [];
        let repoTasks: Map<string, number> = new Map<string, number>();
        let maxTaskId = 0;// init
        for (let repo of repos) {
            let result = await repoTable.findOne(repo.name);
            if (argv.download === "failed" && result !== undefined) {
                maxTaskId = Math.max(maxTaskId, result.task);
                repoTasks.set(repo.name, result.task);
            }
            if (argv.download === "all") {
                replyRepos.push(repo);
            }
            if (argv.download === 'successd' && result !== undefined) {
                maxTaskId = Math.max(maxTaskId, result.task);
                repoTasks.set(repo.name, result.task);
            }
        }

        // 收集到了所有的task
        for (let [key, value] of repoTasks) {
            if ((argv.download === "failed" && value < maxTaskId) || (argv.download === "successd" && value === maxTaskId)) {
                const repo = repos.find(repo => repo.name == key);
                if (repo !== undefined) {
                    replyRepos.push(repo);
                }
            }
        }

        for await (let repo of replyRepos) {
            // 检查是否存在
            let result = await repoTable.find({
                where: {
                    repo: repo.name
                }
            });

            let value: RepoTable;
            // 如果没有找到, 设置初始数据
            if (result.length === 0) {
                value = new RepoTable();
                value.repo = repo.name;
                value.forks = repo.forks_count;
                value.open_issues = repo.open_issues_count;
                value.watchers = repo.watchers_count;
                value.task = maxTaskId;
                await repoTable.manager.save(value);
            }
            else {
                value = result[0];
            }

            const repo_manager = new RepoManager({
                name: repo.name,
                request,
                headers
            });

            const issues = await repo_manager.issue();

            if (issues === null) {
                value.task -= 1;
                await repoTable.createQueryBuilder()
                    .update(RepoTable)
                    .set(value)
                    .where("repo = :repo", {
                        repo: repo.name
                    })
                    .execute();
                continue;
            }
            // 查找到已有的，去掉id相同的
            for await (let issue of issues) {
                let result = await issueTable.find({
                    where: {
                        repo: repo.name,
                        number: issue.number
                    }
                });

                console.log(`${repo.name} ${result.length}`);

                let value = new IssueTable();
                value.number = issue.number;
                value.repo = repo.name;
                value.created_at = issue.created_at;
                value.state = issue.state;

                if (result.length === 0) {
                    await issueTable.manager.save(value);
                }
                else {
                    await issueTable.createQueryBuilder()
                        .update(IssueTable)
                        .set(value)
                        .where("repo = :repo and number = :number", {
                            repo: repo.name,
                            "number": value.number
                        })
                        .execute();
                }
            }

            // update successd
            if (result.length === 0) {
                continue;
            }

            value.task = value.task + 1;
            await repoTable.createQueryBuilder()
                .update(RepoTable)
                .set(value)
                .where("repo = :repo", {
                    repo: repo.name
                })
                .execute();
        }

        // repo_manager.pull().then(async pulls => {
        //     pulls.forEach(pull => {

        //     });
        // });
        console.log(`finished`);
    }

    await repo();
}

// main().catch(error);

(async () => {
    await main();
})();
