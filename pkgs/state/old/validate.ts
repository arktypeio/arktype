import { Middleware } from "@reduxjs/toolkit"
import { ActionData } from "../src/model/common.js"
import { Store } from "./store.js"

export type ValidationFunction<T extends object> = (
    state: T,
    ctx: ValidationContext<T>
) => true | T

export type ValidationContext<T extends object> = {
    store: Store<T, any, any, any>
    action: ActionData<T>
}

export const createValidationMiddleware = <T extends object>(
    validate: ValidationFunction<T>,
    store: Store<T, any, any, any>
): Middleware => {
    return (reduxStore) => (next) => (action: ActionData<T>) => {
        const result = next(action)
        const context: ValidationContext<T> = {
            store,
            action
        }
        const originalState = reduxStore.getState()
        const validationResult = validate(originalState, context)
        if (validationResult !== true) {
            const secondValidationResult = validate(
                validationResult as any,
                context
            )
            if (secondValidationResult !== true) {
                throw new Error(
                    `Your 'validate' function's return value was invalid. ` +
                        `If you cannot determine a valid state, you should throw from your validate function.\n` +
                        `Original state:\n${JSON.stringify(originalState)}\n` +
                        `Validated state:\n${JSON.stringify(
                            secondValidationResult
                        )}\n`
                )
            }
            reduxStore.dispatch({
                type: "validate",
                payload: validationResult,
                meta: { statelessly: true }
            })
        }
        return result
    }
}
