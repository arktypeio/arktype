import { ApolloClient } from "apollo-client";
import { Shape as S, DeepPartial, Class } from "redo-utils";
import { ShapeFilter } from "./filters";
export declare type Handle<T> = (change: DeepPartial<T>) => Promise<void>;
export declare type Handler<T extends S> = {
    [P in keyof T]?: Handle<T[P]>;
};
export declare const handle: <T extends object, C extends DeepPartial<T>>(handler: Handler<T>) => (changes: C) => Promise<void>;
export declare type StoreConfig<T extends S> = {
    rootClass: Class<T>;
    client: ApolloClient<T>;
    handler?: Handler<T>;
};
export declare const createStore: <T extends object>(config: StoreConfig<T>) => {
    query: (q: import("./shapeql").DeepNull<import("./shapeql").RootQuery<T>>) => ShapeFilter<T, import("./shapeql").DeepNull<import("./shapeql").RootQuery<T>>>;
    mutate: <M extends import("./filters").DeepUpdate<T>>(updateMapper: M) => Promise<void>;
    initialize: (values: import("./shapeql").DeepShapeOf<T>) => Promise<void>;
    queryAll: () => T;
    write: (values: Partial<import("./shapeql").DeepShapeOf<T>>) => void;
};
