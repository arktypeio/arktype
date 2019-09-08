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

export type Handle<T> = (change: DeepPartial<T>) => Promise<any>
export type Handler<T extends S> = { [P in keyof T]?: Handle<T[P]> }

export type ShapeQlContextValue<T extends S> = {
    rootClass: Class<T>
    underlying: ApolloClient<T>
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
    underlying: ApolloClient<T> | ClientOptions
}

export class ShapeQl<T extends S> {
    private rootClass: Class<T>
    private underlying: ApolloClient<T>
    private handler?: Handler<T>

    constructor({ rootClass, underlying, handler }: CreateClientArgs<T>) {
        this.rootClass = rootClass
        this.handler = handler
        this.underlying =
            underlying instanceof ApolloClient
                ? underlying
                : (createApolloClient(underlying) as ApolloClient<T>)
    }

    queryAll() {
        return this.query(rootQuery(this.rootClass) as any) as T
    }

    query<Q extends Query<T>>(q: Q) {
        return excludeKeys(
            this.underlying.readQuery({
                query: shapeql(this.rootClass)(q)
            }),
            ["__typename"],
            true
        ) as ShapeFilter<T, Q>
    }

    write(values: ShapedMutation<T>) {
        this.underlying.writeData({
            data: withTypeNames(values, this.rootClass as any)
        })
    }

    async initialize(values: Initialization<T>) {
        await this.underlying.clearStore()
        this.write(values)
    }

    async handle<C extends DeepPartial<T>>(changes: C) {
        if (!this.handler) {
            return
        }
        for (const k in changes) {
            if (k in this.handler) {
                const handle = (this.handler as any)[k] as Handle<any>
                const change = (changes as any)[k] as DeepPartial<any>
                await handle(change)
            }
        }
    }

    async mutate<M extends Mutation<T>>(updateMapper: M) {
        const currentCache = this.queryAll()
        const mutatedCache = updateMap(currentCache, updateMapper as any)
        const changes = diff(currentCache, mutatedCache)
        if (!isDeepStrictEqual(changes, {})) {
            this.write(mutatedCache)
            await this.handle(changes)
        }
    }
}
