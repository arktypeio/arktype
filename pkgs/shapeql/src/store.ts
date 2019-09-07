import { isDeepStrictEqual } from "util"
import { ApolloClient } from "apollo-client"
import { InMemoryCache, InMemoryCacheConfig } from "apollo-cache-inmemory"
import { createHttpLink, HttpLink } from "apollo-link-http"
import { Shape as S, DeepPartial, Class } from "@re-do/utils"
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

const queryAll = <T extends S>({
    rootClass,
    apolloClient: client
}: ShapeQlContextValue<T>) => () =>
    query({ rootClass, apolloClient: client })(rootQuery(rootClass) as any) as T

const query = <T extends S, Q extends Query<T>>({
    rootClass,
    apolloClient: client
}: ShapeQlContextValue<T>) => (q: Q) =>
    excludeKeys(
        client.readQuery({ query: shapeql(rootClass)(q) }),
        ["__typename"],
        true
    ) as ShapeFilter<T, Q>

const write = <T extends S>({
    rootClass,
    apolloClient: client
}: ShapeQlContextValue<T>) => (values: ShapedMutation<T>) => {
    client.writeData({
        data: withTypeNames(values, rootClass as any)
    })
}

const initialize = <T extends S>(config: ShapeQlContextValue<T>) => async (
    values: Initialization<T>
) => {
    await config.apolloClient.clearStore()
    write(config)(values)
}

const mutate = <T extends S>(config: ShapeQlContextValue<T>) => async <
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

export type ShapeQlContextValue<T extends S> = {
    rootClass: Class<T>
    apolloClient: ApolloClient<T>
    handler?: Handler<T>
}

type ClientOptions = {
    link?: HttpLink.Options
    cache?: InMemoryCacheConfig
}

const createApolloClient = ({ link, cache }: ClientOptions) =>
    new ApolloClient({
        link: createHttpLink(link),
        cache: new InMemoryCache(cache)
    })

type CreateClientArgs<T extends S> = Omit<ShapeQlContextValue<T>, "client"> & {
    apolloClient: ApolloClient<T> | ClientOptions
}

export const createClient = <T extends S>({
    rootClass,
    apolloClient,
    handler
}: CreateClientArgs<T>) => {
    const config = {
        rootClass,
        handler,
        apolloClient:
            apolloClient instanceof ApolloClient
                ? apolloClient
                : (createApolloClient(apolloClient) as ApolloClient<T>)
    }
    return {
        query: query(config),
        mutate: mutate(config),
        initialize: initialize(config),
        queryAll: queryAll(config),
        write: write(config)
    }
}
