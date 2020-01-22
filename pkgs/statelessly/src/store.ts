import { isDeepStrictEqual } from "util"
import {
    createStore as createReduxStore,
    Store as ReduxStore,
    Reducer
} from "redux"
import {
    DeepPartial,
    NonRecursible,
    Unlisted,
    updateMap,
    diff,
    shapeFilter,
    ShapeFilter,
    DeepUpdate
} from "@re-do/utils"

export type Store<T> = {
    underlying: ReduxStore<T, MutationAction<T>>
    getState: () => T
    query: <Q extends Query<T>>(q: Q) => ShapeFilter<T, Q>
    mutate: <M extends Mutation<T>>(data: M) => void
}

export const createStore = <T>({
    initial,
    handler
}: StoreArgs<T>): Store<T> => {
    const handle = handler ? createHandle<T>(handler) : undefined
    const rootReducer: Reducer<T, MutationAction<T>> = (
        state: T | undefined,
        { type, data }: MutationAction<T>
    ) => {
        if (!state) {
            return initial
        }
        if (type !== "MUTATION") {
            return state
        }
        const updatedState = updateMap(state, data)
        const changes = diff(state, updatedState)
        if (!isDeepStrictEqual(changes, {})) {
            handle && handle(changes, state)
        }
        return updatedState
    }
    const reduxStore = createReduxStore(rootReducer, initial)
    return {
        underlying: reduxStore,
        getState: reduxStore.getState,
        query: q => shapeFilter(reduxStore.getState(), q),
        mutate: data => reduxStore.dispatch({ type: "MUTATION", data })
    }
}

export const createHandle = <T>(handler: Handler<T>) => async (
    changes: DeepPartial<T>,
    original: T
) => {
    for (const k in changes) {
        if (k in handler) {
            const handleKey = (handler as any)[k] as Handle<any>
            const keyChanges = (changes as any)[k] as DeepPartial<any>
            await handleKey(keyChanges, original)
        }
    }
}

export type StoreArgs<T> = {
    initial: T
    handler?: Handler<T>
}

export type Query<T> = {
    [P in keyof T]?: Unlisted<T[P]> extends NonRecursible
        ? true
        : Query<Unlisted<T[P]>> | true
}

export type Mutation<T> = DeepUpdate<T>

export type Handle<T> = (
    change: DeepPartial<T>,
    original: T
) => void | Promise<void>
export type Handler<T> = { [P in keyof T]?: Handle<T[P]> }

type MutationAction<T> = {
    type: "MUTATION"
    data: Mutation<T>
}
