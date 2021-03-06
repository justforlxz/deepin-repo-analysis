import State from "./State"

export interface IIssue {
    repo: string;
    number: number;
    state: State | string;
    pull_request?: string;
    created_at: Date;
}

export type Issues = Array<IIssue>;
