import { isDeepStrictEqual } from "util"
import {
    createStore as createReduxStore,
    Store as ReduxStore,
    Reducer,
    PreloadedState,
    applyMiddleware
} from "redux"
import { composeWithDevTools, devToolsEnhancer } from "redux-devtools-extension"
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

export type StoreArgs<T> = {
    initial: T
    handler?: Handler<T, T> | Handle<T, T>
    middlewares?: Parameters<typeof applyMiddleware>
}

export const createStore = <T>({
    initial,
    handler,
    middlewares
}: StoreArgs<T>): Store<T> => {
    const handle =
        typeof handler === "object" ? createHandler<T, T>(handler) : handler
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
        if (handle) {
            handle(payload, state)
        }
        return updateMap(state, payload as any)
    }
    const composeEnhancers = composeWithDevTools({})
    const reduxStore = createReduxStore(
        rootReducer,
        initial as PreloadedState<T>,
        middlewares
            ? composeEnhancers(applyMiddleware(...middlewares))
            : devToolsEnhancer({})
    )
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
