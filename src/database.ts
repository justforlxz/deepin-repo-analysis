import { Entity, PrimaryColumn, Column, EntitySchema, PrimaryGeneratedColumn } from "typeorm";
import State from "./types/State";
import { IIssue } from "./types/IIssue";

@Entity("repo")
export class RepoTable {
    @PrimaryColumn()
    public repo!: string;

    @Column()
    public task!: number;

    @Column()
    public watchers?: number;

    @Column()
    public forks?: number;

    @Column()
    public open_issues?: number;
}

@Entity("issue")
export class IssueTable implements IIssue {
    @PrimaryGeneratedColumn('increment')
    public id!: number;

    @Column()
    public created_at!: Date;

    @Column()
    public repo!: string;

    @Column()
    public number!: number;

    @Column()
    public state!: State | string;
}
