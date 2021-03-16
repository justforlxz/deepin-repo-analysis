import yaml from 'js-yaml';
import fs from 'fs';
import "reflect-metadata";
import { ConnectionOptions, createConnection } from 'typeorm';
import { ConnectInstance, Issue, Repo } from './database';
import Koa from "koa";
import json from "koa-json";
import logger from "koa-logger";
import Router from "koa-router";
import { RoutesInstance } from "./router/router";
import args from "./args";
import { ConfigInstance, YamlConfig } from "./config";

const argv = args.argv;

if (!argv.config || !argv.database) {
    process.exit(0);
}

try {
    ConfigInstance.instance.config = yaml.load(fs.readFileSync(`${argv.config}`, 'utf-8')) as YamlConfig;
} catch (e) {
    console.log(e);
    process.exit(-1);
}

async function main() {
    if (ConfigInstance.instance.config === undefined) {
        console.log(`==> missing config!`);
        process.exit(-1);
    }

    const options: ConnectionOptions = {
        type: "mongodb",
        authSource: "admin",
        entities: [Repo, Issue],
        ...ConfigInstance.instance.config.database
    }

    const singleton = ConnectInstance.instance;
    singleton.connection = await createConnection(options);

    const app = new Koa();
    const router = new Router();

    // 开启检查
    // 连接数据库，检查失败的仓库和未完成的任务队列
    // 需要记录任务的执行状态

    const routeInstance = RoutesInstance.instance;
    routeInstance.routes.routers.forEach((value, key) => {
        router.get(key, value);
    });

    app.use(json())
    app.use(logger());
    app.use(router.routes()).use(router.allowedMethods());

    app.listen(3000, () => {
        console.log("start server on localhost:3000.");
    });
}

main().catch(Error);
