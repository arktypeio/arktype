import { Middleware } from "@reduxjs/toolkit"
import { DeepPartial } from "@re-do/utils"
import { ActionData } from "./common"

export type OnChangeMiddlewareArgs<T, Context> =
    | Listener<T, Context>
    | ListenerMap<T, Context>

export const createOnChangeMiddleware = <T extends object, Context>(
    onChange: OnChangeMiddlewareArgs<T, Context>,
    context: Context
): Middleware => {
    const handleChange =
        typeof onChange === "object"
            ? createListener(onChange, context)
            : onChange
    return (store) => (next) => async (action: ActionData<T>) => {
        const result = next(action)
        await handleChange(action.payload, context)
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
