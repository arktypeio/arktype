import {
    configureStore,
    Middleware,
    Store as ReduxStore
} from "@reduxjs/toolkit"
import {
    DeepPartial,
    NonRecursible,
    Unlisted,
    updateMap,
    shapeFilter,
    DeepUpdate,
    AutoPath,
    valueAtPath,
    ValueAtPath,
    transform,
    deepEquals,
    diff
} from "@re-do/utils"

export type StoreOptions<T> = {
    onChange?: ListenerMap<T, T> | Listener<T, T>
    middleware?: Middleware[]
}

export class Store<T extends object, A extends Actions<T>> {
    underlying: ReduxStore<T, ActionData<T>>
    actions: StoreActions<T, A>
    $: StoreActions<T, A>
    private handleChange: Listener<T, T> | undefined

    constructor(
        initial: T,
        actions: A,
        { onChange, middleware }: StoreOptions<T> = {}
    ) {
        this.underlying = this.getReduxStore(initial, middleware ?? [])
        this.handleChange =
            typeof onChange === "object"
                ? createListener<T, T>(onChange)
                : onChange
        this.actions = this.defineActions(actions)
        this.$ = this.actions
    }

    getState = () => this.underlying.getState()

    // Defining the entire function type together avoids excessive stack depth TS error
    get: <P extends string>(path: AutoPath<T, P, "/">) => ValueAtPath<T, P> = (
        path: any
    ) => valueAtPath(this.underlying.getState(), path) as any

    query = <Q extends Query<T>>(q: Q) =>
        shapeFilter(this.underlying.getState(), q)

    update = <U extends Update<T>>(u: U, actionType = "update") => {
        const state = this.getState()
        const updatedState = updateMap(state, u)
        const changes = diff(state, updatedState)
        if (!deepEquals(changes, {})) {
            this.handleChange && this.handleChange(changes, state)
        }
        this.underlying.dispatch({
            type: actionType,
            payload: updatedState,
            meta: {
                statelessly: true
            }
        })
    }

    private getReduxStore = (initial: T, middleware: Middleware[]) =>
        configureStore<T, ActionData<T>, any>({
            preloadedState: initial,
            middleware,
            reducer: (state: T | undefined, { payload, meta }) => {
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
        })

    private defineActions = (actions: A): StoreActions<T, A> =>
        transform(actions, ([actionType, actionValue]) => {
            return [
                actionType,
                (args: any) => {
                    let update: Update<T>
                    if (actionValue instanceof Function) {
                        const returnValue = actionValue(args, this as any)
                        if (returnValue instanceof Promise) {
                            returnValue.then((resolvedValue) => {
                                this.update(resolvedValue, actionType)
                            })
                            return returnValue
                        } else {
                            update = actionValue(args, this as any) as Update<T>
                        }
                    } else {
                        // args shouldn't exist if updater was not a function
                        update = actionValue
                    }
                    this.update(update, actionType)
                }
            ]
        }) as any
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

export type Actions<T extends object> = Record<
    string,
    | Update<T>
    | ((
          args: any,
          context: Store<T, Actions<T>> & Record<string, any>
      ) => Update<T> | Promise<Update<T>>)
>

// This allows us to convert from the user provided actions, which can use context to access
// the store in their definitions, to actions as they are attached to the Store, which do not
// require context as a parameter as it is passed internally

type RemoveContextFromArgs<T extends unknown[]> = T extends []
    ? []
    : T extends [infer Current, ...infer Rest]
    ? Current extends Store<any, any>
        ? RemoveContextFromArgs<Rest>
        : [Current, ...RemoveContextFromArgs<Rest>]
    : T

export type StoreActions<T extends object, A extends Actions<T>> = {
    [K in keyof A]: A[K] extends (...args: any) => any
        ? (
              ...args: RemoveContextFromArgs<Parameters<A[K]>>
          ) => ReturnType<A[K]> extends Promise<any> ? Promise<void> : void
        : () => void
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
