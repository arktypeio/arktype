import { Middleware } from "@reduxjs/toolkit"
import { DeepPartial, listify } from "@re-do/utils"
import { ActionData } from "./common"

export type OnChangeMiddlewareArgs<T, Context> =
    | Listener<T, Context>
    | ListenerMap<T, Context>
    | Array<Listener<T, Context> | ListenerMap<T, Context>>

export const createOnChangeMiddleware = <T extends object, Context>(
    onChange: OnChangeMiddlewareArgs<T, Context>,
    context: Context
): Middleware => {
    const handlers: Listener<T, Context>[] = []
    for (const listener of listify(onChange)) {
        if (typeof listener === "function") {
            handlers.push(listener)
        } else if (typeof listener === "object") {
            handlers.push(createListener(listener, context))
        } else {
            throw new Error(
                `Cannot create a listener from '${listener}' of type '${typeof listener}.'`
            )
        }
    }
    return (store) => (next) => async (action: ActionData<T>) => {
        const result = next(action)
        for (const handler of handlers) {
            await handler(action.payload, context)
        }
        return result
    }
}

export const createListener =
    <ChangedState, Context>(
        handler: ListenerMap<ChangedState, Context>,
        context: Context
    ) =>
    async (changes: DeepPartial<ChangedState>) => {
        for (const k in changes) {
            if (k in handler) {
                const change = (changes as any)[k] as any
                const handleKey = (handler as any)[k] as Listener<any, any>
                await handleKey(change, context)
            }
        }
    }

export type Listener<ChangedState, Context> = (
    change: DeepPartial<ChangedState>,
    context: Context
) => void | Promise<void>

export type ListenerMap<ChangedState, Context> = {
    [K in keyof ChangedState]?: Listener<ChangedState[K], Context>
}
