import type { IntegerLiteral } from "../../utils/numericLiterals.js"
import type { IntersectFn, PruneFn } from "../node.js"

export type BigintAttributes = { readonly literals?: readonly IntegerLiteral[] }

export const intersectBigints: IntersectFn<BigintAttributes> = (l, r) => {
    if (l.literals && r.literals) {
        const literals = l.literals.filter((value) =>
            r.literals!.includes(value)
        )
        return literals.length
            ? { literals }
            : {
                  never: `${JSON.stringify(l)} and ${JSON.stringify(
                      r
                  )} have no overlap`
              }
    }
    return l.literals ? l : r
}

export const pruneBigint: PruneFn<BigintAttributes> = (l, r) => {
    if (l.literals) {
        const result = l.literals.filter(
            (value) => !r.literals!.includes(value)
        )
        return result.length ? { literals: result } : undefined
    }
}

export const checkBigint = (data: bigint, attributes: BigintAttributes) =>
    attributes.literals ? attributes.literals.includes(`${data}`) : true
