import State from "./State"

export interface IIssue {
    repo: string;
    number: number;
    html_url: string;
    state: State | string;
    pull_request?: string;
    created_at: Date;
}

export type Issues = Array<IIssue>;
