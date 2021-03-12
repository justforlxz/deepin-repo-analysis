import { RequestHeaders } from "@octokit/types";
import { NullLiteral } from "typescript";
import { IIssue, Issues } from "./types/IIssue";
import { IPull, Pulls } from "./types/IPull";
import State from "./types/State";

type OctokitRequest = import("@octokit/types").RequestInterface<object>;

export interface RepoManagerOption {
    // name of repo
    name: string;
    request: OctokitRequest;
    headers?: RequestHeaders;
}

export enum Event {
    issue = "issue",
    pull = "pull"
}

export type HandleFunctionType = (...args: any[]) => void;

export class RepoManager implements RepoManagerOption {
    private issueUrl: string = 'GET /repos/{owner}/{repo}/issues';
    private pullUrl: string = 'GET /repos/{owner}/{repo}/pulls';
    private handleMap: Map<Event, HandleFunctionType[]>;

    public request!: OctokitRequest;
    public name!: string;
    public headers?: RequestHeaders;
    public issues?: Issues;
    public pulls?: Pulls;

    constructor (option: RepoManagerOption) {
        Object.assign(this, option);
        this.handleMap = new Map<Event, HandleFunctionType[]>();
    }

    public on(event: Event, handler: HandleFunctionType): void {
        let array = this.handleMap.get(event);

        if (array === undefined) {
            this.handleMap.set(event, []);
            array = [];
        }

        this.handleMap.set(event, array.concat(handler));
    }

    public async issue(): Promise<Issues | null> {
        let index: number = 1;
        let issues: Issues = [];
        let issueIndex: Array<number> = [];
        let tryCount = 0;
        for (; ;) {
            if (tryCount >= 3) {
                return null;
            }

            const response = await this.request(this.issueUrl, {
                headers: this.headers,
                owner: 'linuxdeepin',
                repo: this.name,
                page: index,
                state: 'all',
            });

            if (response.status !== 200) {
                // 保存失败的页数
                tryCount += 1;
            }

            let tmpNeed: Issues = [];
            response.data.forEach((issue: IIssue) => {
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

        issues.forEach(issue => {
            issue.repo = this.name;
        });

        return issues;
    }

    async pull(): Promise<Pulls> {
        let index: number = 1;
        let pulls: Pulls = [];
        let pullIndex: Array<number> = [];
        for (; ;) {
            const response = await this.request(this.pullUrl, {
                headers: this.headers,
                owner: 'linuxdeepin',
                repo: this.name,
                page: index,
                state: 'all',
            });

            if (response.status !== 200) {
                continue;
            }

            let tmpNeed: Pulls = [];
            response.data.forEach((pull: IPull) => {
                let p: IPull = pull;
                if (pullIndex.indexOf(pull.number) == -1) {
                    pullIndex.push(pull.number);
                    if (pull.merged_at !== null) {
                        p.state = State.Merge;
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

        return pulls;
    }
}
