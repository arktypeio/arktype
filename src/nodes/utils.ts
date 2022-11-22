import { isEmpty } from "../utils/deepEquals.js"
import { keySet } from "../utils/generics.js"
import { SetOperations } from "./node.js"

export const keySetOperations = {
    intersection: (a, b) => ({ ...a, ...b }),
    difference: (a, b) => {
        const result = { ...a }
        for (const k in b) {
            delete result[k]
        }
        return isEmpty(result) ? undefined : result
    }
} satisfies SetOperations<keySet>
