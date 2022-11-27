import type { IntegerLiteral } from "../../utils/numericLiterals.js"
import type { IntersectFn, PruneFn } from "../node.js"

export type BigintAttributes = { readonly equals?: readonly IntegerLiteral[] }

export const intersectBigints: IntersectFn<BigintAttributes> = (l, r) => {
    if (l.equals && r.equals) {
        const equals = l.equals.filter((value) => r.equals!.includes(value))
        return equals.length
            ? { equals }
            : {
                  type: "never",
                  reason: `${JSON.stringify(l)} and ${JSON.stringify(
                      r
                  )} have no overlap`
              }
    }
    return l.equals ? l : r
}

export const pruneBigint: PruneFn<BigintAttributes> = (l, r) => {
    if (l.equals) {
        const result = l.equals.filter((value) => !r.equals!.includes(value))
        return result.length ? { equals: result } : undefined
    }
}

export const checkBigint = (data: bigint, attributes: BigintAttributes) =>
    attributes.equals ? attributes.equals.includes(`${data}`) : true
