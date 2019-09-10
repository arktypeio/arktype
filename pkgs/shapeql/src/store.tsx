import React, { ReactNode, createContext, useContext, useState } from "react"
import { isDeepStrictEqual } from "util"
import { DeepPartial, Class } from "@re-do/utils"
import { ShapeFilter, excludeKeys, updateMap, diff } from "./filters"
import { ApolloClient } from "./getApolloClient"
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
export type Handler<T> = { [P in keyof T]?: Handle<T[P]> }

export type StoreArgs<T> = {
    root: Class<T>
    client: ApolloClient
    handler?: Handler<T>
}

export class Store<T> {
    protected root: Class<T>
    protected client: ApolloClient
    protected handler?: Handler<T>
    public onChanges?: (changes: DeepPartial<T>) => any

    constructor({ root, client, handler }: StoreArgs<T>) {
        this.root = root
        this.client = client
        this.handler = handler
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
            if (this.onChanges) {
                this.onChanges(changes)
            }
        }
    }
}

export class StoreWithHooks<T> extends Store<T> {
    hooks = {
        useQuery: <Q extends Query<T>>(q: Q) => {
            useContext(StoreContext)
            return this.query(q)
        }
    }
}

const StoreContext = createContext<any>({} as any)

export type StoreProviderProps<T> = {
    children: ReactNode
    store: Store<T>
}

export const StoreProvider = <T extends any>({
    children,
    store
}: StoreProviderProps<T>) => {
    const [data, setData] = useState(store.queryAll())
    store.onChanges = changes => setData(store.queryAll())
    return (
        <StoreContext.Provider value={data}>{children}</StoreContext.Provider>
    )
}

export const StoreConsumer = StoreContext.Consumer
