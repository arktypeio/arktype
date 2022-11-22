import { isEmpty } from "../utils/deepEquals.js"
import type { keySet } from "../utils/generics.js"
import { defineOperations } from "./attributes.js"

export const keySetOperations = defineOperations<keySet>()({
    intersection: (a, b) =>
        typeof a === "string"
            ? typeof b === "string"
                ? a === b
                    ? a
                    : { [a]: true, [b]: true }
                : { ...b, [a]: true }
            : typeof b === "string"
            ? { ...a, [b]: true }
            : { ...a, ...b },
    subtract: (a, b) => {
        const difference = { ...a }
        for (const k in b) {
            delete difference[k]
        }
        return isEmpty(difference) ? undefined : difference
    }
})
