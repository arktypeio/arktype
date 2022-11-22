import { isEmpty } from "../utils/deepEquals.js"
import type { keySet } from "../utils/generics.js"
import { defineOperations } from "./attributes.js"

export const keySetOperations = defineOperations<keySet>()({
    intersection: (a, b) => ({ ...a, ...b }),
    difference: (a, b) => {
        const result = { ...a }
        for (const k in b) {
            delete result[k]
        }
        return isEmpty(result) ? undefined : result
    }
})
