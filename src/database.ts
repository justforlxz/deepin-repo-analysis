import { Entity, PrimaryColumn, Column, PrimaryGeneratedColumn, ObjectID, ObjectIdColumn } from "typeorm";
import State from "./types/State";
import { IIssue } from "./types/Issue";
import { IPull } from "./types/Pull";

import { Endpoints } from "@octokit/types";

export type RepoType = Endpoints["GET /repos/{owner}/{repo}"]["response"]["data"];
export type IssueType = Endpoints["GET /repos/{owner}/{repo}/issues"]["response"]["data"];
export type PullType = Endpoints["GET /repos/{owner}/{repo}/pulls"]["response"]["data"];

@Entity()
export class Repo {
    @ObjectIdColumn()
    public id!: ObjectID;

    @Column()
    public name!: string;

    @Column()
    public repo!: RepoType;
}

@Entity()
export class Issue {
    @ObjectIdColumn()
    public id!: ObjectID;

    @Column()
    public name!: string; // maybe use repo type

    @Column()
    public issue?: IssueType;
}

@Entity()
export class Pull {
    @ObjectIdColumn()
    public id!: ObjectID;

    @Column()
    public name!: string;

    @Column()
    public pull?: PullType;
}

// TODO: missing webhook table

// @Entity("repo")
// export class RepoTable {
//     @PrimaryColumn()
//     public repo!: string;

//     @Column()
//     public task!: number;

//     @Column()
//     public watchers?: number;

//     @Column()
//     public forks?: number;

//     @Column()
//     public open_issues?: number;
// }

// @Entity("issue")
// export class IssueTable implements IIssue {
//     @PrimaryGeneratedColumn('increment')
//     public id!: number;

//     @Column()
//     public created_at!: Date;

//     @Column()
//     public repo!: string;

//     @Column()
//     public number!: number;

//     @Column()
//     public state!: State | string;
// }

// @Entity("pull")
// export class PullTable implements IPull {
//     @PrimaryGeneratedColumn('increment')
//     public id!: number;

//     @Column()
//     public repo!: string;

//     @Column()
//     public merged_at?: Date;

//     @Column()
//     public closed_at?: Date;

//     @Column()
//     public created_at!: Date;

//     @Column()
//     public updated_at!: Date;

//     @Column()
//     public number!: number;

//     @Column()
//     public locked!: boolean;

//     @Column()
//     public state!: State | string;

//     @Column()
//     public title!: string;

//     @Column()
//     public body!: string;
// }
