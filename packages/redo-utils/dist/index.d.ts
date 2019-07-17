import { classToPlain, plainToClass } from "class-transformer";
export declare const walk: (dir: string) => string[];
export declare const objectify: typeof classToPlain;
export declare const classify: typeof plainToClass;
export declare type Shape = object;
export declare const memoize: <F extends (...args: any[]) => any>(f: F) => F;
export declare type MapReturn<F, V> = F extends (value: V) => infer R ? R : any;
export declare type Class<T> = new (...args: any[]) => T;
export declare type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends NonRecursible ? Required<T[P]> : DeepRequired<T[P]>;
};
export declare type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends NonRecursible ? T[P] : DeepPartial<T[P]>;
};
export declare type ValueOf<T> = T[keyof T];
export declare type ValueFrom<T, K extends keyof T> = Pick<T, K>[K];
export declare type Primitive = string | number | boolean | symbol;
export declare type NonRecursible = Primitive | Function | null | undefined;
export declare const isRecursible: (o: any) => boolean;
export declare const deepMap: (from: object | any[], map: (value: any) => any) => object;
export declare type ItemOrList<T> = T | T[];
export declare type Unlisted<T> = T extends (infer V)[] ? V : T;
export declare const listify: <T>(o: ItemOrList<T>) => T[];
export declare type Key = string | number;
export declare type Entry = [Key, any];
export declare const fromEntries: (entries: [Key, any][], asArray?: boolean) => any;
