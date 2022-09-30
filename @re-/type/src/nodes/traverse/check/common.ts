import { toString } from "@re-/tools"

export const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })
