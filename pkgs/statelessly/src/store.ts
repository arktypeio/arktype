import { isDeepStrictEqual } from "util"
import {
    configureStore,
    Middleware,
    Store as ReduxStore,
    Reducer
} from "@reduxjs/toolkit"
import {
    DeepPartial,
    NonRecursible,
    Unlisted,
    updateMap,
    diff,
    shapeFilter,
    ShapeFilter,
    DeepUpdate,
    ValueOf,
    Path,
    valueAtPath
} from "@re-do/utils"

export type Store<T> = {
    underlying: ReduxStore<T, MutationAction<T>>
    getState: () => T
    get: <P extends Path<T>>(p: P) => any
    query: <Q extends Query<T>>(q: Q) => ShapeFilter<T, Q>
    mutate: <M extends Mutation<T>>(data: M) => void
}

export type StoreArgs<T> = {
    initial: T
    handler?: Handler<T, T> | Handle<T, T>
    middleware?: Middleware[]
}

export const createStore = <T>({
    initial,
    handler,
    middleware
}: StoreArgs<T>): Store<T> => {
    const rootReducer: Reducer<T, MutationAction<T>> = (
        state: T | undefined,
        { type, payload }
    ) => {
        if (!state) {
            return initial
        }
        if (type !== "MUTATION") {
            return state
        }
        // Since updateMap has already been executed in the mutate function,
        // update functions have already been converted to resultant values
        // and payload should only include serializable values
        return updateMap(state, payload as any)
    }
    const handle =
        typeof handler === "object" ? createHandler<T, T>(handler) : handler
    const reduxMiddleware = middleware ? [...middleware] : []
    if (handle) {
        reduxMiddleware.push(({ getState }) => (next) => (action) => {
            handle(action.payload, getState())
            return next(action)
        })
    }
    const reduxStore = configureStore({
        reducer: rootReducer,
        preloadedState: initial,
        middleware: reduxMiddleware
    })
    return {
        underlying: reduxStore,
        getState: reduxStore.getState,
        query: (q) => shapeFilter(reduxStore.getState(), q),
        mutate: (updates) => {
            const state = reduxStore.getState()
            const updatedState = updateMap(state, updates)
            const changes = diff(state, updatedState)
            if (!isDeepStrictEqual(changes, {})) {
                reduxStore.dispatch({ type: "MUTATION", payload: changes })
            }
        }
    }
}

export const createHandler = <HandledState, RootState>(
    handler: Handler<HandledState, RootState>
) => async (changes: DeepPartial<HandledState>, context: RootState) => {
    for (const k in changes) {
        if (k in handler) {
            const handleKey = (handler as any)[k] as Handle<any, RootState>
            const keyChanges = (changes as any)[k] as DeepPartial<any>
            await handleKey(keyChanges, context)
        }
    }
}

export type Query<T> = {
    [P in keyof T]?: Unlisted<T[P]> extends NonRecursible
        ? true
        : Query<Unlisted<T[P]>> | true
}

export type Mutation<T> = DeepUpdate<T>

export type Handle<HandledState, RootState> = (
    change: DeepPartial<HandledState>,
    context: RootState
) => void | Promise<void>

export type Handler<HandledState, RootState> = {
    [K in keyof HandledState]?: Handle<HandledState[K], RootState>
}

type MutationAction<T> = {
    type: "MUTATION"
    payload: DeepPartial<T>
}
