export interface IIssue {
    number: number;
    html_url: string;
    state: string;
}

export type Issues = Array<IIssue>;
