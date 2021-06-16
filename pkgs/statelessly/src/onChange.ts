import { Middleware } from "@reduxjs/toolkit"
import { DeepPartial, listify } from "@re-do/utils"
import { ActionData } from "./common"
import { Store } from "./store"

export type OnChangeMiddlewareArgs<T extends object> =
    | Listener<T, T>
    | ListenerMap<T, T>
    | Array<Listener<T, T> | ListenerMap<T, T>>

export type OnChangeContext<T extends object> = {
    store: Store<T, any>
    action: ActionData<T>
}

export const createOnChangeMiddleware = <T extends object>(
    onChange: OnChangeMiddlewareArgs<T>,
    store: Store<T, any>
): Middleware => {
    const handlers: Listener<T, T>[] = []
    for (const listener of listify(onChange)) {
        if (typeof listener === "function") {
            handlers.push(listener)
        } else if (typeof listener === "object") {
            handlers.push(createListener(listener))
        } else {
            throw new Error(
                `Cannot create a listener from '${listener}' of type '${typeof listener}.'`
            )
        }
    }
    return (reduxStore) => (next) => async (action: ActionData<T>) => {
        const result = next(action)
        if (!action.meta.bypassOnChange) {
            for (const handler of handlers) {
                await handler(action.payload, { store, action })
            }
        }
        return result
    }
}

export const createListener =
    <ChangedState, RootState extends object>(
        handler: ListenerMap<ChangedState, RootState>
    ) =>
    async (
        changes: DeepPartial<ChangedState>,
        context: OnChangeContext<RootState>
    ) => {
        for (const k in changes) {
            if (k in handler) {
                const change = (changes as any)[k] as any
                const handleKey = (handler as any)[k] as Listener<any, any>
                await handleKey(change, context)
            }
        }
    }

export type Listener<ChangedState, RootState extends object> = (
    change: DeepPartial<ChangedState>,
    context: OnChangeContext<RootState>
) => void | Promise<void>

export type ListenerMap<ChangedState, RootState extends object> = {
    [K in keyof ChangedState]?: Listener<
        ChangedState[K],
        OnChangeContext<RootState>
    >
}
