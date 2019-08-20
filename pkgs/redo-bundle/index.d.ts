import { Configuration } from "webpack";
import { ValueFrom } from "redo-utils";
export declare const env: any;
export declare const isDev: () => boolean;
export declare type BaseName = keyof typeof baseOptions;
export declare type BaseConfigOptions = {
    base: BaseName;
    entry: ValueFrom<Configuration, "entry">;
    devServer?: boolean;
};
export declare const makeConfig: ({ base, entry, devServer }: BaseConfigOptions, merged?: Partial<Configuration>[]) => Configuration;
declare const baseOptions: {
    common: Configuration;
    web: Configuration;
    injectable: Configuration;
    renderer: Configuration;
};
export {};
