import { RouterContext } from "koa-router";
import { ConnectInstance, Issue } from "../database";
import { IssueManager } from "../repo_manager";
import { request } from "@octokit/request";
import { RequestHeaders } from '@octokit/types';
import { ConfigInstance } from "../config"

async function refreshIssue(name: string): Promise<Issue[] | null> {
    const headers: RequestHeaders = {
        authorization: `token ${ConfigInstance.instance.config?.token}`
    }

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

const handle = async (ctx: RouterContext) => {
    interface RepoQuery {
        repo?: string;
    }

    let req_query = <RepoQuery> ctx.query;

    if (req_query.repo === undefined) {
        return;
    }

    // query by database
    if (ConnectInstance.instance.connection === undefined) {
        ctx.redirect("/error");
        return;

    }
    const manager = ConnectInstance.instance.connection.getMongoRepository(Issue);
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
    const issues = await refreshIssue(req_query.repo) ?? [];
    for await (let issue of issues) {
        await manager.save(issue);
    }

    ctx.body = issues;
}

export default handle;
