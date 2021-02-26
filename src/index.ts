import { Octokit } from '@octokit/core';
import yaml from 'js-yaml';
import fs from 'fs';
import yargs from 'yargs';
import { Pulls, IPull } from './types/IPull'
import { Repos, IRepo } from './types/IRepo';
import { Issues, IIssue } from './types/IIssue'

const yarg = yargs
    .option('config', {
        alias: 'c',
        description: 'load config yaml',
        type: 'string',
        requiresArg: true
    })
    .help()
    .alias('help', 'h');

const argv = yarg.argv;

if (!argv.config) {
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

const octokit = new Octokit({ auth: `${token}`})

interface Result {
    name: string;
    issues: Issues;
    pulls: Pulls;
}

type Results = Result[];

let result: Results = [];

async function issue(repo: string): Promise<void> {
    let index: number = 0;
    let issues: Issues = [];
    for (; ;) {
        const response = await octokit.request('GET /repos/{owner}/{repo}/issues', {
            owner: 'linuxdeepin',
            repo,
            page: index,
            state: 'all'
        });

        if (response.status !== 200) {
            continue;
        }

        const tmp: Issues = response.data;

        if (tmp.length === 0) {
            break;
        }

        issues = issues.concat(tmp);
        index += 1;
    }

    for (let item of result) {
        if (item.name == repo) {
            item.issues = issues;
            return;
        }
    }

    let s: Result = {
        name: repo,
        issues,
        pulls: []
    }

    result.push(s);
}

async function repo() {
    let index: number = 0;
    let repos: Repos = [];
    for (; ;) {
        const response = await octokit.request('GET /orgs/{org}/repos', {
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
        await issue(repo.name)
    }
}

(async () => {
    await repo();
})()

console.log(`repo,open,close`)
for (let item of result) {
    let opens = 0;
    let closes = 0;
    for (let issue of item.issues) {
        if (issue.state === 'oepn') {
            opens += 1;
        }
        else {
            closes += 1;
        }
    }
    console.log(`${item.name},${opens},${closes}`)
}
