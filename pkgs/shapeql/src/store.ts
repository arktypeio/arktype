import { isDeepStrictEqual } from "util"
import { ApolloClient } from "apollo-client"
import { Shape as S, DeepPartial, Class } from "redo-utils"
import { ShapeFilter, excludeKeys, updateMap, diff } from "./filters"
import {
    shapeql,
    ShapedMutation,
    Initialization,
    Mutation,
    Query,
    rootQuery,
    withTypeNames
} from "./shapeql"

const queryAll = <T extends S>({ rootClass, client }: StoreConfig<T>) => () =>
    query({ rootClass, client })(rootQuery(rootClass) as Query<T>) as T

const query = <T extends S, Q extends Query<T>>({
    rootClass,
    client
}: StoreConfig<T>) => (q: Q) =>
    excludeKeys(
        client.readQuery({ query: shapeql(rootClass)(q) }),
        ["__typename"],
        true
    ) as ShapeFilter<T, Q>

const write = <T extends S>({ rootClass, client }: StoreConfig<T>) => (
    values: ShapedMutation<T>
) => {
    client.writeData({
        data: withTypeNames(values, rootClass as any)
    })
}

const initialize = <T extends S>(config: StoreConfig<T>) => async (
    values: Initialization<T>
) => {
    await config.client.clearStore()
    write(config)(values)
}

const mutate = <T extends S>(config: StoreConfig<T>) => async <
    M extends Mutation<T>
>(
    updateMapper: M
) => {
    const currentCache = queryAll(config)()
    const mutatedCache = updateMap(currentCache, updateMapper as any)
    const changes = diff(currentCache, mutatedCache)
    if (!isDeepStrictEqual(changes, {})) {
        write(config)(mutatedCache)
        if (config.handler) {
            await handle(config.handler)(changes)
        }
    } else {
        console.log("Mutation wouldn't change the existing value, skipping.")
    }
}

export type Handle<T> = (change: DeepPartial<T>) => Promise<any>
export type Handler<T extends S> = { [P in keyof T]?: Handle<T[P]> }

export const handle = <T extends S, C extends DeepPartial<T>>(
    handler: Handler<T>
) => async (changes: C) => {
    for (const k in changes) {
        if (k in handler) {
            const handle = (handler as any)[k] as Handle<any>
            const change = (changes as any)[k] as DeepPartial<any>
            handle(change)
        }
    }
}

export type StoreConfig<T extends S> = {
    rootClass: Class<T>
    client: ApolloClient<T>
    handler?: Handler<T>
}

export const createStore = <T extends S>(config: StoreConfig<T>) => ({
    query: query(config),
    mutate: mutate(config),
    initialize: initialize(config),
    queryAll: queryAll(config),
    write: write(config)
})
