import type { mutable, xor } from "../../utils/generics.js"
import type { Bounds } from "../bounds.js"
import { checkBounds, intersectBounds } from "../bounds.js"
import { isNever } from "./degenerate.js"
import { TypeOperations } from "./operations.js"
import { intersectAdditiveValues } from "./utils.js"

export type StringAttributes = xor<
    {
        readonly regex?: readonly string[]
        readonly bounds?: Bounds
    },
    { readonly values?: readonly string[] }
>

export const stringOperations = {
    intersect: (l, r) => {
        if (l.values || r.values) {
            const values = l.values ?? r.values!
            const attributes = l.values ? r : l
            const result: string[] = values.filter((value) =>
                stringOperations.check(value, attributes)
            )
            return result.length
                ? { values: result }
                : // TODO: Abstract never types
                  {
                      type: "never",
                      reason: `none of ${JSON.stringify(
                          values
                      )} satisfy ${JSON.stringify(attributes)}`
                  }
        }
        const result: mutable<StringAttributes> = {}
        const regex = intersectAdditiveValues(l.regex, r.regex)
        if (regex) {
            result.regex = regex
        }
        const bounds = intersectBounds(l.bounds, r.bounds)
        if (bounds) {
            if (isNever(bounds)) {
                return bounds
            }
            result.bounds = bounds
        }
        return result
    },
    prune: (branch) => branch,
    check: (data, attributes) => {
        if (attributes.values) {
            return attributes.values.includes(data)
        }
        if (attributes.bounds && !checkBounds(attributes.bounds, data.length)) {
            return false
        }
        if (attributes.regex) {
            for (const source of attributes.regex) {
                if (!regexCache[source]) {
                    regexCache[source] = new RegExp(source)
                }
                if (!regexCache[source].test(data)) {
                    return false
                }
            }
        }
        return true
    }
} satisfies TypeOperations<string, StringAttributes>

const regexCache: Record<string, RegExp> = {}
