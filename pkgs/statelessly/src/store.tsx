import { isDeepStrictEqual } from "util"
import { createStore as createReduxStore, Store as ReduxStore } from "redux"
import { DeepPartial } from "@re-do/utils"
import { updateMap, diff, shapeFilter, ShapeFilter } from "./filters"
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

export type Store<T> = {
    getContents: () => T
    query: <Q extends Query<T>>(q: Q) => ShapeFilter<T, Q>
    update: <M extends Update<T>>(data: M) => void
    underlying: ReduxStore<T, UpdateAction<T>>
}

export const createStore = <T,>({
    initial,
    handler
}: StoreArgs<T>): Store<T> => {
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
        getContents: () => redux.getState(),
        query: q => shapeFilter(redux.getState(), q),
        update: data => redux.dispatch({ type: "UPDATE", data }),
        underlying: redux
    }
}
