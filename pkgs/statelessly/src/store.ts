import {
    configureStore,
    ConfigureStoreOptions,
    Middleware,
    Store as ReduxStore
} from "@reduxjs/toolkit"
import {
    updateMap,
    shapeFilter,
    AutoPath,
    valueAtPath,
    ValueAtPath,
    transform,
    deepEquals,
    diff,
    Paths
} from "@re-do/utils"
import { Query, Update, Actions, ActionData, StoreActions } from "./common.js"
import { createOnChangeMiddleware, OnChangeMiddlewareArgs } from "./onChange.js"
import { createValidationMiddleware, ValidationFunction } from "./validate.js"
import { createAddIdsMiddleware, CreateAddIdsMiddlewareArgs } from "./addIds.js"
import { Relationships } from "./db"

export type ReduxOptions = Omit<
    ConfigureStoreOptions,
    "preloadedState" | "reducer"
>

export type StoreOptions<Input extends object> = {
    relationships?: Relationships<Input>
    onChange?: OnChangeMiddlewareArgs<T>
    validate?: ValidationFunction<T>
    reduxOptions?: ReduxOptions
}

export type UpdateOptions = {
    actionType?: string
    bypassOnChange?: boolean
    meta?: Record<string, any>
}

export type Stored<Input extends object> = Input

export class Store<
    Input extends object,
    A extends Actions<T>,
    AddIdPaths extends Paths<T>,
    IdFieldName extends string
> {
    underlying: ReduxStore<T, ActionData<T>>
    actions: StoreActions<T, A, AddIdPaths, IdFieldName>
    $: StoreActions<T, A, AddIdPaths, IdFieldName>

    constructor(
        initial: T,
        actions: A,
        {
            onChange,
            addIds,
            validate,
            reduxOptions = {}
        }: StoreOptions<T, AddIdPaths, IdFieldName> = {}
    ) {
        const statelesslyMiddleware: Middleware[] = []
        if (addIds) {
            statelesslyMiddleware.push(createAddIdsMiddleware(addIds))
        }
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

    // Defining the entire function type together avoids excessive stack depth TS error
    get: <P extends string>(path: AutoPath<T, P, "/">) => ValueAtPath<T, P> = (
        path: any
    ) => valueAtPath(this.underlying.getState(), path) as any

    query = <Q extends Query<T>>(q: Q) =>
        shapeFilter(this.underlying.getState(), q)

    update = <U extends Update<T>>(
        u: U,
        { actionType = "update", bypassOnChange, meta }: UpdateOptions = {}
    ) => {
        const state = this.getState()
        const updatedState = updateMap(state, u)
        const changes = diff(state, updatedState)
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

    private defineActions = (
        actions: A
    ): StoreActions<T, A, AddIdPaths, IdFieldName> =>
        transform(actions, ([actionType, actionValue]) => {
            return [
                actionType,
                (args: any) => {
                    let update: Update<T>
                    if (actionValue instanceof Function) {
                        const returnValue = actionValue(args, this as any)
                        if (returnValue instanceof Promise) {
                            returnValue.then((resolvedValue) => {
                                this.update(resolvedValue, { actionType })
                            })
                            return returnValue
                        } else {
                            update = actionValue(args, this as any) as Update<T>
                        }
                    } else {
                        // args shouldn't exist if updater was not a function
                        update = actionValue
                    }
                    this.update(update, { actionType })
                }
            ]
        }) as any
}
