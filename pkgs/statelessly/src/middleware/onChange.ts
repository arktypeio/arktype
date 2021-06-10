import { Middleware } from "@reduxjs/toolkit"
import { DeepPartial } from "@re-do/utils"
import { ActionData } from "../common"

export type OnChangeMiddlewareArgs<T> = Listener<T> | ListenerMap<T>

export const createOnChangeMiddleware = <T extends object>(
    onChange: OnChangeMiddlewareArgs<T>
): Middleware => {
    const handleChange =
        typeof onChange === "object" ? createListener(onChange) : onChange
    return (store) => (next) => async (action: ActionData<T>) => {
        const result = next(action)
        await handleChange(action.payload)
        return result
    }
}

export const createListener =
    <ChangedState>(handler: ListenerMap<ChangedState>) =>
    async (changes: DeepPartial<ChangedState>) => {
        for (const k in changes) {
            if (k in handler) {
                const change = (changes as any)[k] as any
                const handleKey = (handler as any)[k] as Listener<any>
                await handleKey(change)
            }
        }
    }

export type Listener<ChangedState> = (
    change: DeepPartial<ChangedState>
) => void | Promise<void>

export type ListenerMap<ChangedState> = {
    [K in keyof ChangedState]?: Listener<ChangedState[K]>
}
