import State from "./State"

export interface IPull {
    merged_at: null;
    number: number;
    url: string;
    html_url: string;
    state: State | string;
}

export type Pulls = Array<IPull>;
