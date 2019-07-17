import { Key, NonRecursible } from "redo-utils";
export declare type ExcludedByKeys<O, K extends Key[]> = Pick<O, Exclude<keyof O, K[number]>>;
export declare type DeepExcludedByKeys<O, K extends Key[]> = {
    [P in keyof ExcludedByKeys<O, K>]: O[P] extends NonRecursible | any[] ? O[P] : DeepExcludedByKeys<O[P], K>;
};
export declare const excludeKeys: <O, K extends Key[], D extends boolean = false>(o: O, keys: K, deep?: D | undefined) => D extends true ? DeepExcludedByKeys<O, K> : Pick<O, Exclude<keyof O, K[number]>>;
