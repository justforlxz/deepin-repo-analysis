import { Entity, Column, ObjectID, ObjectIdColumn, Connection } from "typeorm";
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

export class ConnectInstance {
    public connection?: Connection;
    private static _instance: ConnectInstance;
    public static get instance() {
        if (!this._instance) {
            this._instance = new ConnectInstance();
        } else {
            console.log('lazy loading singleton has created')
        }
        return this._instance;
    }
}
