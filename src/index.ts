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

const octokit = new Octokit({ auth: `${token}` })

interface Result {
    name: string;
    issues: Issues;
    pulls: Pulls;
}

type Results = Result[];

let result: Results = [];

async function pull(repo: string): Promise<void> {
    let index: number = 1;
    let pulls: Pulls = [];
    let pullIndex: Array<number> = [];
    for (; ;) {
        const response = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
            owner: 'linuxdeepin',
            repo,
            page: index,
            state: 'all',
        });

        if (response.status !== 200) {
            continue;
        }

        let tmpNeed: Pulls = [];
        response.data.forEach(pull => {
            let p: IPull = pull;
            if (pullIndex.indexOf(pull.number) == -1) {
                pullIndex.push(pull.number);
                if (pull.merged_at !== null) {
                    p.state = "merge";
                }
                tmpNeed.push(p);
            }
        });

        if (tmpNeed.length === 0) {
            break;
        }

        pulls = pulls.concat(tmpNeed);
        index += 1;
    }

    console.error(`${repo},${pulls.length}`);

    for (let r of result) {
        if (r.name == repo) {
            r.pulls = pulls;
            return;
        }
    }

    let s: Result = {
        name: repo,
        issues: [],
        pulls
    }

    result.push(s);
}

async function issue(repo: string): Promise<void> {
    let index: number = 1;
    let issues: Issues = [];
    let issueIndex: Array<number> = [];
    for (; ;) {
        const response = await octokit.request('GET /repos/{owner}/{repo}/issues', {
            owner: 'linuxdeepin',
            repo,
            page: index,
            state: 'all',
        });

        if (response.status !== 200) {
            continue;
        }

        let tmpNeed: Issues = [];
        response.data.forEach(issue => {
            if (!('pull_request' in issue) && issueIndex.indexOf(issue.number) == -1) {
                issueIndex.push(issue.number);
                tmpNeed.push(issue);
            }
        });

        if (tmpNeed.length === 0) {
            break;
        }

        issues = issues.concat(tmpNeed);
        index += 1;
    }

    console.error(`${repo},${issues.length}`);

    for (let r of result) {
        if (r.name == repo) {
            r.issues = issues;
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
        await issue(repo.name);
        await pull(repo.name);
    }
}

(async () => {
    await repo();
    console.log(`repo,open_issues,closed_issues,open_pulls,closed_pulls,merge_pulls`)
    result.forEach(r => {
        let issue_open_count = 0;
        let issue_close_count = 0;
        let pull_open_count = 0;
        let pull_close_count = 0;
        let pull_merge_count = 0;

        r.issues.forEach(issue => {
            if (issue.state === "open") {
                issue_open_count += 1;
            }
            else {
                issue_close_count += 1;
            }
        });

        r.pulls.forEach(pull => {
            if (pull.state === "open") {
                pull_open_count += 1;
            }
            else if (pull.state === "closed") {
                pull_close_count += 1;
            }
            else {
                pull_merge_count += 1;
            }
        });

        if (r.issues.length !== 0 && r.pulls.length !== 0) {
            console.log(`${r.name},${issue_open_count},${issue_close_count},${pull_open_count},${pull_close_count},${pull_merge_count}`);
        }
    });
})()
