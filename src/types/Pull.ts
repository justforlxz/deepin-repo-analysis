import State from "./State"

export interface IPull {
    merged_at?: Date;
    closed_at?: Date;
    created_at: Date;
    updated_at: Date;
    number: number;
    locked: boolean;
    state: State | string;
    title: string;
    body: string;
}

export type Pulls = Array<IPull>;
