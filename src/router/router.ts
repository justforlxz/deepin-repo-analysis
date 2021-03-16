import { RouterContext } from "koa-router";
import IssueHandle from "./issue";

export class Routes {
    public routers: Map<string, (context: RouterContext) => void>;
    constructor () {
        this.routers = new Map();
        this.routers.set("/issue", IssueHandle);
    }
}

export class RoutesInstance {
    public routes: Routes;
    private static _instance: RoutesInstance;
    public static get instance() {
        if (this._instance === undefined) {
            this._instance = new RoutesInstance();
        } else {
            console.log('lazy loading singleton has created')
        }
        return this._instance;
    }
    private constructor () {
        this.routes = new Routes();
    }
}
