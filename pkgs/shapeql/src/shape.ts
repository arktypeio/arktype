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

type ClientOptions = {
    link?: HttpLink.Options
    cache?: InMemoryCacheConfig
}

const createApolloClient = ({ link, cache }: ClientOptions) =>
    new ApolloClient({
        link: createHttpLink(link),
        cache: new InMemoryCache(cache)
    })

type ShapeArgs<T extends S, L extends S> = {
    root: Class<T>
    client?: ApolloClient<T> | ClientOptions
    local?: {
        root: Class<L>
        handler?: Handler<L>
    }
}

export class Shape<T extends S, L extends S> {
    private root: Class<T>
    private client: ApolloClient<T>
    private local?: LocalShape

    constructor({ root, client, local }: ShapeArgs<T, L>) {}
}

type StoreArgs<T extends S> = {
    root: Class<T>
    client?: ApolloClient<T> | ClientOptions
    handler?: Handler<T>
}

export class LocalShape<T extends S> {
    public root: Class<T>
    public client: ApolloClient<T>
    public handler?: Handler<T>

    constructor({ root, client = {}, handler }: StoreArgs<T>) {
        this.root = root
        this.handler = handler
        this.client =
            client instanceof ApolloClient
                ? client
                : (createApolloClient(client) as ApolloClient<T>)
    }

    queryAll() {
        return this.query(rootQuery(this.root) as any) as T
    }

    query<Q extends Query<T>>(q: Q) {
        return excludeKeys(
            this.client.readQuery({
                query: shapeql(this.root)(q)
            }),
            ["__typename"],
            true
        ) as ShapeFilter<T, Q>
    }

    write(values: ShapedMutation<T>) {
        this.client.writeData({
            data: withTypeNames(values, this.root as any)
        })
    }

    async initialize(values: Initialization<T>) {
        await this.client.clearStore()
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
