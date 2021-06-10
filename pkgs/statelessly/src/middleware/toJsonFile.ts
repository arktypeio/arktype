import { Middleware } from "redux"
import { ActionData } from "../common"

export type JsonFileMiddlewareArgs = {
    path: string
}

export const createJsonFileMiddleware =
    <T extends object>({ path }: JsonFileMiddlewareArgs): Middleware =>
    (store) =>
    (next) =>
    async (action: ActionData<T>) => {
        const result = next(action)
        return result
    }
