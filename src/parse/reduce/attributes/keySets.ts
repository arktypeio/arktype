import { isEmpty } from "../../../utils/deepEquals.js"
import type { keyOrSet, keySet } from "../../../utils/generics.js"
import { defineOperations } from "./attributes.js"

export const defineKeyOrSetOperations = <k extends string = string>() =>
    defineOperations<keyOrSet<k>>()({
        intersect: (a, b) => {
            if (typeof a === "string") {
                if (typeof b === "string") {
                    return a === b ? a : ({ [a]: true, [b]: true } as keySet<k>)
                }
                b[a] = true
                return b
            }
            if (typeof b === "string") {
                a[b] = true
                return a
            }
            return keySetOperations.intersect(a, b)
        },
        exclude: (a, b) => {
            if (typeof a === "string") {
                if (typeof b === "string") {
                    return a === b ? null : a
                }
                return a in b ? null : a
            }
            if (typeof b === "string") {
                const difference = { ...a }
                delete difference[b]
                return isEmpty(difference) ? null : difference
            }
            return keySetOperations.exclude(a, b)
        }
    })

export const stringKeyOrSetOperations = defineKeyOrSetOperations<string>()

export const keySetOperations = defineOperations<keySet>()({
    intersect: (a, b) => Object.assign(a, b),
    exclude: ({ ...a }, b): keySet | null => {
        for (const k in b) {
            delete (a as any)[k]
        }
        return isEmpty(a) ? null : a
    }
})
