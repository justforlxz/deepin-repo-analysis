import { RequestHeaders } from "@octokit/types";
import { IIssue } from "./types/Issue";

import { IssueType, PullType } from "./database";

type OctokitRequest = import("@octokit/types").RequestInterface<object>;

export interface RepoManagerOption {
    name: string;
    request: OctokitRequest;
    headers?: RequestHeaders;
    tryCount?: number;
}

interface ValidatorInterface<T> {
    update(target: T): T;
}

class RepoManagerBase<T> implements RepoManagerOption {
    public readonly name!: string;
    public readonly request!: OctokitRequest;
    public readonly headers?: RequestHeaders;
    protected url!: string;
    public readonly tryCount: number = 3;
    protected validator?: ValidatorInterface<T>;
    public async run(callback?: (parmars: T) => void): Promise<T[] | null> {
        let index: number = 1;
        let values: T[] = [];
        let tryCount = 0;
        for (; ;) {
            if (tryCount >= this.tryCount) {
                return null;
            }

            const response = await this.request(this.url, {
                headers: this.headers,
                owner: 'linuxdeepin',
                repo: this.name,
                page: index,
                state: 'all',
            });

            if (response.status !== 200) {
                // 保存失败的页数
                tryCount += 1;
                continue;
            }

            if (response.data.length === 0) {
                break;
            }

            values = values.concat(response.data);

            index += 1;
        }

        // set 去重
        this.values = [...new Set(values)];

        if (callback !== undefined) {
            this.values.forEach(value => callback(value));
        }

        return this.values;
    }
    public values?: T[] | null;
    // 还需要记录回调函数
    constructor (option: RepoManagerOption) {
        this.name = option.name;
        this.request = option.request;
        this.headers = option.headers;
        // this.url;
    }
}

export class IssueManager extends RepoManagerBase<IssueType> implements ValidatorInterface<IssueType> {
    public readonly url!: string;
    constructor (option: RepoManagerOption) {
        super(option);
        this.validator = this;
        this.url = 'GET /repos/{owner}/{repo}/issues';
    }

    update(target: IssueType): IssueType {
        Object.assign(target, { "repo": this.name });
        return target;
    }
}

export class PullManager extends RepoManagerBase<PullType> implements ValidatorInterface<PullType> {
    public readonly url!: string;
    constructor (option: RepoManagerOption) {
        super(option);
        this.validator = this;
        this.url = 'GET /repos/{owner}/{repo}/pulls';
    }

    update(target: PullType): PullType {
        Object.assign(target, { "repo": this.name });
        return target;
    }
}
