import yaml from 'js-yaml';
import fs from 'fs';
import yargs from 'yargs';
import "reflect-metadata";
import { ConnectionOptions, createConnection } from 'typeorm';
import { Issue, IssueType, Repo, RepoType } from './database';
import Koa from "koa";
import Router from "koa-router";
import json from "koa-json";
import logger from "koa-logger";
import { RequestHeaders } from '@octokit/types';
import { request } from "@octokit/request";
import { IssueManager } from './repo_manager';

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
    type: "mongodb",
    host: "127.0.0.1",
    database: "deepin",
    port: 55597,
    logging: true,
    username: "root",
    password: "fuckgfw",
    authSource: "admin",
    entities: [Repo, Issue]
}

const app = new Koa();
const router = new Router();

// 开启检查
// 连接数据库，检查失败的仓库和未完成的任务队列
// 需要记录任务的执行状态

router.get("/issue", async (ctx) => {
    const connection = await createConnection(options);
    const headers: RequestHeaders = {
        authorization: `token ${token}`
    }

    async function refreshIssue(name: string): Promise<Issue[] | null> {
        const repo_manager = new IssueManager({
            name,
            request,
            headers
        });

        const issues = await repo_manager.run();
        let result: Issue[] | null = [];

        issues?.forEach(issue => {
            let v = new Issue();
            v.name = name;
            v.issue = issue;
            result?.push(v);
        });

        return issues === null ? null : result;
    }

    interface RepoQuery {
        repo?: string;
    }

    let req_query = <RepoQuery> ctx.query;

    if (req_query.repo === undefined) {
        return;
    }

    // query by database
    const manager = connection.getMongoRepository(Issue);
    const result = await manager.find({
        where: {
            name: req_query.repo
        }
    });

    if (result.length !== 0) {
        ctx.body = result;
        return;
    }

    // query by github
    ctx.body = await refreshIssue(req_query.repo)
});

app.use(json())
app.use(logger());
app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => {
    console.log("start server on localhost:3000.");
});
