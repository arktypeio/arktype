import React, { ReactNode, createContext, useContext, useState } from "react"
import { isDeepStrictEqual } from "util"
import { createStore as createReduxStore } from "redux"
import { DeepPartial } from "@re-do/utils"
import { updateMap, diff, shapeFilter } from "./filters"
import { Update, Query } from "./statelessly"

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

type UpdateAction<T> = {
    type: "UPDATE"
    data: Update<T>
}

export const createStore = <T,>({ initial, handler }: StoreArgs<T>) => {
    const handle = handler ? createHandle<T>(handler) : undefined
    const rootReducer = (state: any, { type, data }: UpdateAction<T>) => {
        if (type !== "UPDATE") {
            return state
        }
        const updatedState = updateMap(state, data)
        const changes = diff(state, updatedState)
        if (!isDeepStrictEqual(changes, {})) {
            handle && handle(changes)
        }
        return updatedState
    }
    const redux = createReduxStore(rootReducer, initial)
    return {
        getAll: (): T => redux.getState(),
        get: <Q extends Query<T>>(q: Q) => shapeFilter(redux.getState(), q),
        update: <M extends Update<T>>(data: M) =>
            redux.dispatch({ type: "UPDATE", data })
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
