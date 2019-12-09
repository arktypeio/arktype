import React, { ReactNode, createContext, useContext, useState } from "react"
import { isDeepStrictEqual } from "util"
import { DeepPartial, Class } from "@re-do/utils"
import { ShapeFilter, updateMap, diff, shapeFilter } from "./filters"
import {
    shapeql,
    ShapedMutation,
    Initialization,
    Mutation,
    Query,
    rootQuery
} from "./shapeql"

export type Handle<T> = (change: DeepPartial<T>) => Promise<any>
export type Handler<T> = { [P in keyof T]?: Handle<T[P]> }

export type StoreArgs<T> = {
    initial: T
    handler?: Handler<T>
}

export const createHandle = <T extends any>(handler: Handler<T>) => async (
    changes: DeepPartial<T>
) => {
    for (const k in changes) {
        if (k in handler) {
            const handleKey = (handler as any)[k] as Handle<any>
            const keyChanges = (changes as any)[k] as DeepPartial<any>
            await handleKey(keyChanges)
        }
    }
}

export class Store<T> {
    protected data: T
    protected handle?: Handle<T>
    public onChanges?: (changes: DeepPartial<T>) => any

    constructor({ initial, handler }: StoreArgs<T>) {
        this.data = initial
        this.handle = handler ? createHandle<T>(handler) : undefined
    }

    queryAll() {
        return this.query(rootQuery(this.root) as any) as T
    }

    query<Q extends Query<T>>(q: Q) {
        return shapeFilter(this.data, q)
    }

    write(values: ShapedMutation<T>) {
        this.client.writeData({
            data: values
        })
    }

    async mutate<M extends Mutation<T>>(updateMapper: M) {
        const currentCache = this.queryAll()
        const mutatedCache = updateMap(currentCache, updateMapper as any)
        const changes = diff(currentCache, mutatedCache)
        if (!isDeepStrictEqual(changes, {})) {
            this.write(mutatedCache)
            this.handle && (await this.handle(changes))
            this.onChanges && this.onChanges(changes)
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
