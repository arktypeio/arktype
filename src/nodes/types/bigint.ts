import type { IntegerLiteral } from "../../utils/numericLiterals.js"
import type { IntersectFn, PruneFn } from "../node.js"

export type BigintAttributes = { readonly values?: readonly IntegerLiteral[] }

export const intersectBigints: IntersectFn<BigintAttributes> = (l, r) => {
    if (l.values && r.values) {
        const values = l.values.filter((value) => r.values!.includes(value))
        return values.length
            ? { values }
            : {
                  type: "never",
                  reason: `${JSON.stringify(l)} and ${JSON.stringify(
                      r
                  )} have no overlap`
              }
    }
    return l.values ? l : r
}

export const pruneBigint: PruneFn<BigintAttributes> = (l, r) => {
    if (l.values) {
        const result = l.values.filter((value) => !r.values!.includes(value))
        return result.length ? { values: result } : undefined
    }
}

export const checkBigint = (data: bigint, attributes: BigintAttributes) =>
    attributes.values ? attributes.values.includes(`${data}`) : true
