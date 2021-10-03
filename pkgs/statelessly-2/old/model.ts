import { Middleware } from "@reduxjs/toolkit"
import {
    deepMap,
    mapPaths,
    isEmpty,
    updateMap,
    valueAtPath,
    Unlisted
} from "@re-do/utils"
import { ActionData, StoreInput } from "../src/common.js"

export const createModelMiddleware = <T extends StoreInput>(
    model: Model<T>
): Middleware => {
    // Q: Is this a good variable name?
    // A:  ↓
    const idK = keyName ?? "id"
    const pathMap = mapPaths(paths)
    return (reduxStore) => (next) => (action: ActionData<T>) => {
        // Convert {} (pathMap leaves) to update functions that will add an ID
        const updateWithIds = deepMap(
            pathMap,
            ([k, v], { path }) => [
                k,
                isEmpty(v)
                    ? (existing: any) => {
                          if (!Array.isArray(existing)) {
                              throw new Error(
                                  `Can only add IDs to paths at which the value is a list. Found ${JSON.stringify(
                                      existing
                                  )} of type ${typeof existing} at ${path.join(
                                      "/"
                                  )}.`
                              )
                          }
                          return existing.map((_) => ({ ..._, [idK]: 1 }))
                      }
                    : v
            ],
            {
                filterWhen: ([k, v], { path }) =>
                    !valueAtPath(action.payload, path.join("/") as any)
            }
        ) as any
        const payload = updateMap(action.payload, updateWithIds)
        const result = next({ ...action, payload })
        return result
    }
}
