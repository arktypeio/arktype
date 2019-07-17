import { NonRecursible, Shape as S, Class, Unlisted } from "redo-utils";
import { DeepUpdate } from "./filters";
export declare type DeepNullShapeOf<T> = {
    [P in keyof T]?: T[P] extends NonRecursible ? null : DeepNullShapeOf<T[P]>;
};
export declare type ExcludeByValue<T, V> = Pick<T, {
    [K in keyof T]: T[K] extends V ? never : K;
}[keyof T]>;
export declare type DeepNonNullableObjects<T> = {
    [P in keyof ExcludeByValue<T, NonRecursible>]-?: P extends keyof T ? NonNullable<DeepNonNullableObjects<T[P]>> : never;
};
export declare type DeepShapeOf<T> = T & DeepNonNullableObjects<T>;
export declare type DeepNull<T> = {
    [P in keyof T]?: DeepNull<T[P]> | null;
};
export declare type RootQuery<T> = {
    [P in keyof T]-?: Unlisted<T[P]> extends NonRecursible ? null : RootQuery<Unlisted<T[P]>>;
};
export declare type Query<T extends S> = DeepNull<RootQuery<T>>;
export declare type ShapedQuery<T extends S> = DeepNullShapeOf<RootQuery<T>>;
export declare type Initialization<T extends S> = DeepShapeOf<T>;
export declare type Mutation<T extends S> = DeepUpdate<T>;
export declare type ShapedMutation<T extends S> = Partial<Initialization<T>>;
export declare const shapeql: <T extends object, Q extends DeepNull<RootQuery<T>>>(root: Class<T>) => (query: Q) => any;
export declare const toGql: <T extends object>(query: DeepNullShapeOf<RootQuery<T>>) => any;
export declare type RootQueryOptions<T extends S> = {
    rootClass: Class<T>;
};
export declare const rootQuery: <T extends object>(rootClass: Class<T>) => RootQuery<T>;
export declare const withTypeNames: <T extends object>(sourceObject: T, classWithMetadata: Class<T>) => T;
