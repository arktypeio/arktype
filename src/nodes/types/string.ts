import type { mutable, xor } from "../../utils/generics.js"
import type { Bounds } from "../bounds.js"
import { checkBounds, intersectBounds } from "../bounds.js"
import { isNever } from "./degenerate.js"
import type { IntersectFn, PruneFn } from "./operations.js"
import { intersectAdditiveValues } from "./utils.js"

export type StringAttributes = xor<
    {
        readonly regex?: readonly string[]
        readonly bounds?: Bounds
    },
    { readonly values?: readonly string[] }
>

export const intersectStrings: IntersectFn<StringAttributes> = (l, r) => {
    if (l.values || r.values) {
        const values = l.values ?? r.values!
        const attributes = l.values ? r : l
        const result: string[] = values.filter((value) =>
            checkString(value, attributes)
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
    const result = { ...l, ...r } as mutable<StringAttributes>
    if (l.regex && r.regex) {
        result.regex = intersectAdditiveValues(l.regex, r.regex)
    }
    if (l.bounds && r.bounds) {
        const bounds = intersectBounds(l.bounds, r.bounds)
        if (isNever(bounds)) {
            return bounds
        }
        result.bounds = bounds
    }
    return result
}

export const pruneString: PruneFn<StringAttributes> = (branch, given) => {
    return branch
}

const regexCache: Record<string, RegExp> = {}

export const checkString = (data: string, attributes: StringAttributes) => {
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
