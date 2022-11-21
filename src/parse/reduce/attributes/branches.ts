import type { Attribute } from "./attributes.js"
import { defineOperations } from "./attributes.js"

export const branches = defineOperations<Attribute<"branches">>()({
    intersect: (a, b) => {
        if (a[0] === "&") {
            if (b[0] === "&") {
                a[1].push(...b[1])
            } else {
                a[1].push(b)
            }
            return a
        }
        if (b[0] === "&") {
            b[1].push(a)
            return b
        }
        return ["&", [a, b]]
    },
    // TODO: fix
    extract: (a, b) => a as any,
    exclude: (a, b) => a as any
})
