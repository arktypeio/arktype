import {
    configureStore,
    ConfigureStoreOptions,
    Middleware,
    StoreEnhancer,
    Store as ReduxStore
} from "@reduxjs/toolkit"
import {
    updateMap,
    shapeFilter,
    valueAtPath,
    ValueAtPath,
    transform,
    deepEquals,
    addedOrChanged,
    PathOf,
    DeepUpdate
} from "@re-do/utils"
import { Query, Update, Actions, ActionData, StoreActions } from "./common"
import { createOnChangeMiddleware, OnChangeMiddlewareArgs } from "./onChange"
import { createValidationMiddleware, ValidationFunction } from "./validate"

export type ReduxOptions = Omit<
    ConfigureStoreOptions,
    "preloadedState" | "reducer"
>

export type StoreOptions<T extends object> = {
    onChange?: OnChangeMiddlewareArgs<T>
    reduxOptions?: ReduxOptions
    validate?: ValidationFunction<T>
}

export type UpdateOptions = {
    actionType?: string
    bypassOnChange?: boolean
    meta?: Record<string, any>
}

export class Store<T extends object, A extends Actions<T>> {
    underlying: ReduxStore<T, ActionData<T>>
    actions: StoreActions<T, A>
    $: StoreActions<T, A>

    constructor(
        initial: T,
        actions: A,
        { onChange, validate, reduxOptions = {} }: StoreOptions<T> = {}
    ) {
        const statelesslyMiddleware: Middleware[] = []
        if (validate) {
            statelesslyMiddleware.push(
                createValidationMiddleware(validate, this)
            )
        }
        if (onChange) {
            statelesslyMiddleware.push(createOnChangeMiddleware(onChange, this))
        }
        const middleware = reduxOptions.middleware
            ? typeof reduxOptions.middleware === "function"
                ? (getDefaultMiddleware: any) =>
                      (reduxOptions.middleware as any)(
                          getDefaultMiddleware().concat(statelesslyMiddleware)
                      )
                : reduxOptions.middleware.concat(statelesslyMiddleware)
            : statelesslyMiddleware
        this.underlying = this.getReduxStore(initial, {
            ...reduxOptions,
            middleware
        })
        this.actions = this.defineActions(actions)
        this.$ = this.actions
    }

    getState = () => this.underlying.getState()

    get = <P extends string>(path: PathOf<T, P>) =>
        valueAtPath(this.underlying.getState(), path)

    query = <Q extends Query<T>>(q: Q) =>
        shapeFilter(this.underlying.getState(), q)

    update = <U extends Update<T>>(
        u: U,
        {
            actionType = "update",
            bypassOnChange = false,
            meta
        }: UpdateOptions = {}
    ) => {
        const state = this.getState()
        const updatedState = updateMap(state, u)
        const changes = addedOrChanged(state, updatedState)
        if (!deepEquals(changes, {})) {
            this.underlying.dispatch({
                type: actionType,
                payload: changes,
                meta: {
                    ...meta,
                    statelessly: true,
                    bypassOnChange
                }
            })
        }
    }

    private getReduxStore = (initial: T, options: ReduxOptions) =>
        configureStore<T, ActionData<T>, any>({
            preloadedState: initial,
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
            },
            ...options
        })

    private defineActions = (actions: A): StoreActions<T, A> =>
        transform(actions, ([actionType, actionValue]) => {
            return [
                actionType,
                (args: any) => {
                    let update: Update<T>
                    if (typeof actionValue === "function") {
                        const returnValue = actionValue(args, this as any)
                        if (returnValue instanceof Promise) {
                            returnValue.then((resolvedValue) => {
                                this.update(resolvedValue, {
                                    actionType: actionType as string
                                })
                            })
                            return returnValue
                        } else {
                            update = actionValue(args, this as any) as Update<T>
                        }
                    } else {
                        // args shouldn't exist if updater was not a function
                        update = actionValue as DeepUpdate<T>
                    }
                    this.update(update, { actionType: actionType as string })
                }
            ]
        }) as any
}
