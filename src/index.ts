import { Octokit } from '@octokit/core';
import yaml from 'js-yaml'
import fs from 'fs'

import { Issues, IIssue } from './types/IIssue'

const config = yaml.load(fs.readFileSync(`${__dirname}/config.yaml`, 'utf-8'));

const octokit = new Octokit({ auth: ""})

async function issue(repo: string) {
    let index: number = 0;
    let issues: Issues = [];
    for (;;) {
        const response = await octokit.request('GET /repos/{owner}/{repo}/issues', {
            owner: 'linuxdeepin',
            repo,
            page: index,
            state: 'all'
        });

        if (response.status === 200) {
            break;
        }

        const tmp: Issues = response.data;
        issues = issues.concat(tmp);
        index += 1;
    }

    console.log(issues.length)
}

(async () => {
    await issue("dde-control-center");
})()
