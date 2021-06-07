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
    shapeFilter,
    ShapeFilter,
    DeepUpdate,
    AutoPath,
    valueAtPath,
    ValueAtPath,
    transform,
    deepEquals,
    diff
} from "@re-do/utils"

export type Actions<T extends object> = Record<
    string,
    Update<T> | ((...args: any) => Update<T> | Promise<Update<T>>)
>

export type StoreActions<T extends object, A extends Actions<T>> = {
    [K in keyof A]: A[K] extends (...args: any) => any
        ? (
              ...args: Parameters<A[K]>
          ) => ReturnType<A[K]> extends Promise<any> ? Promise<void> : void
        : () => void
}

export type Store<T extends object, A extends Actions<T>> = {
    underlying: ReduxStore<T, ActionData<T>>
    getState: () => T
    get: <P extends string>(path: AutoPath<T, P, "/">) => ValueAtPath<T, P>
    query: <Q extends Query<T>>(q: Q) => ShapeFilter<T, Q>
    update: <U extends Update<T>>(u: U) => void
} & StoreActions<T, A>

export type StoreOptions<T> = {
    onChange?: ListenerMap<T, T> | Listener<T, T>
    middleware?: Middleware[]
}

export const createStore = <T extends object, A extends Actions<T>>(
    initial: T,
    actions: A,
    options: StoreOptions<T> = {}
): Store<T, A> => {
    const { onChange, middleware } = options
    const rootReducer: Reducer<T, ActionData<T>> = (
        state: T | undefined,
        { payload, meta }
    ) => {
        if (!state) {
            return initial
        }
        if (!meta?.statelessly) {
            return state
        }
        // Since payload has already been transformed by a prior updateMap call
        // in the action function, at this point all mapping functions have been
        // converted to their resultant serializable values
        return updateMap(state, payload as any)
    }
    const handleChange =
        typeof onChange === "object" ? createListener<T, T>(onChange) : onChange
    const reduxMiddleware = middleware ? [...middleware] : []
    const reduxStore = configureStore({
        reducer: rootReducer,
        preloadedState: initial,
        middleware: reduxMiddleware
    })
    const performUpdate = (actionType: string, update: Update<T>) => {
        const state = reduxStore.getState()
        const updatedState = updateMap(state, update)
        const changes = diff(state, updatedState)
        if (!deepEquals(changes, {})) {
            handleChange && handleChange(changes, state)
        }
        reduxStore.dispatch({
            type: actionType,
            payload: updatedState,
            meta: {
                statelessly: true
            }
        })
    }
    const storeActions = transform(actions, ([actionType, actionValue]) => {
        return [
            actionType,
            (...args: any) => {
                let update: Update<T>
                if (actionValue instanceof Function) {
                    const returnValue = actionValue(...args)
                    if (returnValue instanceof Promise) {
                        returnValue.then((resolvedValue) => {
                            performUpdate(actionType, resolvedValue)
                        })
                        return returnValue
                    } else {
                        update = actionValue(...args) as Update<T>
                    }
                } else {
                    // args shouldn't exist if updater was not a function
                    update = actionValue
                }
                performUpdate(actionType, update)
            }
        ]
    }) as any as StoreActions<T, A>
    return {
        ...storeActions,
        underlying: reduxStore,
        getState: reduxStore.getState,
        query: (q) => shapeFilter(reduxStore.getState(), q),
        // any types are a temporary workaround for excessive stack depth on type comparison error in TS
        get: ((path: any) => valueAtPath(reduxStore.getState(), path)) as any,
        update: (u) => performUpdate("update", u)
    }
}

export const createListener =
    <ChangedState, RootState>(handler: ListenerMap<ChangedState, RootState>) =>
    async (changes: DeepPartial<ChangedState>, context: RootState) => {
        for (const k in changes) {
            if (k in handler) {
                const change = (changes as any)[k] as any
                const handleKey = (handler as any)[k] as Listener<
                    any,
                    RootState
                >
                await handleKey(change, context)
            }
        }
    }

export type Query<T> = {
    [P in keyof T]?: Unlisted<T[P]> extends NonRecursible
        ? true
        : Query<Unlisted<T[P]>> | true
}

export type Update<T> = DeepUpdate<T>

export type Listener<ChangedState, RootState> = (
    change: DeepPartial<ChangedState>,
    context: RootState
) => void | Promise<void>

export type ListenerMap<ChangedState, RootState> = {
    [K in keyof ChangedState]?: Listener<ChangedState[K], RootState>
}

export type ActionData<T> = {
    type: string
    payload: DeepPartial<T>
    meta: {
        statelessly: true
    }
}
