import type { IntegerLiteral } from "../../utils/numericLiterals.js"
import type { TypeOperations } from "./operations.js"

export type BigintAttributes = { readonly values?: readonly IntegerLiteral[] }

export const bigintOperations: TypeOperations<bigint, BigintAttributes> = {
    intersect: (l, r) => {
        if (l.values && r.values) {
            const values = l.values.filter((value) => r.values!.includes(value))
            return values.length
                ? { values }
                : [
                      {
                          type: "never",
                          reason: `${JSON.stringify(l)} and ${JSON.stringify(
                              r
                          )} have no overlap`
                      }
                  ]
        }
        return l.values ? l : r
    },
    prune: (l, r) => {
        if (l.values) {
            const result = l.values.filter(
                (value) => !r.values!.includes(value)
            )
            return result.length ? { values: result } : undefined
        }
    },
    check: (data, attributes) =>
        attributes.values ? attributes.values.includes(`${data}`) : true
}
