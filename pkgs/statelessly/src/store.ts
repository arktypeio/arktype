import {
    configureStore,
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
    diff
} from "@re-do/utils"
import { Query, Update, Actions, ActionData, StoreActions } from "./common"
import { createOnChangeMiddleware, OnChangeMiddlewareArgs } from "./onChange"
import { createValidationMiddleware, ValidationFunction } from "./validate"

export type StoreOptions<T extends object> = {
    onChange?: OnChangeMiddlewareArgs<T>
    middleware?: Middleware[]
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
        { onChange, middleware, validate }: StoreOptions<T> = {}
    ) {
        const middlewares = middleware ? [...middleware] : []
        if (validate) {
            middlewares.push(createValidationMiddleware(validate, this))
        }
        if (onChange) {
            middlewares.push(createOnChangeMiddleware(onChange, this))
        }
        this.underlying = this.getReduxStore(initial, middlewares)
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
