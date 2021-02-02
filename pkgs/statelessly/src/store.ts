import { isDeepStrictEqual } from "util"
import {
    createStore as createReduxStore,
    Store as ReduxStore,
    Reducer,
    PreloadedState
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
    const handle = handler ? createHandler<T, T>(handler) : undefined
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
    const reduxStore = createReduxStore(rootReducer, initial as PreloadedState<T>)
    return {
        underlying: reduxStore,
        getState: reduxStore.getState,
        query: q => shapeFilter(reduxStore.getState(), q),
        mutate: data => reduxStore.dispatch({ type: "MUTATION", data })
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

export type StoreArgs<T> = {
    initial: T
    handler?: Handler<T, T>
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
    data: Mutation<T>
}
