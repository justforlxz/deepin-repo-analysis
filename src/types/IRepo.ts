import { UniqueESSymbolType } from "typescript";

export interface IRepo {
    name: string;
    full_name: string;
    open_issues_count?: number;
    forks_count?: number;
    watchers_count?: number;
}

export type Repos = Array<IRepo>;
