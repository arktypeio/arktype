import { Key, NonRecursible } from "redo-utils";
export declare type FilteredByKeys<O, K extends Key[]> = Pick<O, Extract<keyof O, K[number]>>;
export declare type DeepFilteredByKeys<O, K extends Key[]> = {
    [P in keyof FilteredByKeys<O, K>]: O[P] extends NonRecursible | any[] ? O[P] : DeepFilteredByKeys<O[P], K>;
};
export declare const filterKeys: <O, K extends Key[], D extends boolean = false>(o: O, keys: K, deep?: D | undefined) => D extends true ? DeepFilteredByKeys<O, K> : Pick<O, Extract<keyof O, K[number]>>;
