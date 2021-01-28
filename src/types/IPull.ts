export interface IPull {
    url: string;
    html_url: string;
    state: string;
}

export type Pulls = Array<IPull>;
