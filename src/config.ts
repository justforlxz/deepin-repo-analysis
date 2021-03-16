export interface DataBaseConfig {
    host: string;
    database: string;
    port: number;
    logging: boolean;
    username: string;
    password: string;
}

export interface YamlConfig {
    token?: string;
    database?: DataBaseConfig;
}

export class ConfigInstance {
    public config?: YamlConfig;
    private static _instance: ConfigInstance;
    public static get instance() {
        if (!this._instance) {
            this._instance = new ConfigInstance();
        } else {
            console.log('lazy loading singleton has created')
        }
        return this._instance;
    }
}
