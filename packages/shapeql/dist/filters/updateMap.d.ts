import { NonRecursible } from "redo-utils";
export declare type UpdateFunction<T> = (value: T) => T;
export declare type Update<T> = T | UpdateFunction<T>;
export declare type DeepUpdate<T> = {
    [P in keyof T]?: T[P] extends NonRecursible | any[] ? Update<T[P]> : DeepUpdate<T[P]>;
};
export declare const updateMap: <T extends object>(current: T, updater: DeepUpdate<T>) => T;
