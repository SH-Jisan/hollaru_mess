declare enum Environment {
    Development = "development",
    Production = "production",
    Test = "test"
}
declare class EnvironmentVariables {
    NODE_ENV: Environment;
    PORT: number;
    DATABASE_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_ACCESS_EXPIRATION: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRATION: string;
    REDIS_HOST?: string;
    REDIS_PORT?: number;
    REDIS_PASSWORD?: string;
    REDIS_TLS?: string;
}
export declare function validate(config: Record<string, any>): EnvironmentVariables;
export {};
