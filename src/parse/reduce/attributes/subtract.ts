import { isEmpty } from "../../../utils/deepEquals.js"
import type { RegexLiteral } from "../../../utils/generics.js"
import type {
    Attribute,
    AttributeKey,
    Attributes,
    DisjointKey
} from "./attributes.js"
import { subtractBounds } from "./bounds.js"
import { subtractDivisors } from "./divisor.js"
import { subtractKeySets, subtractKeysOrSets } from "./keySets.js"

export const subtract = (a: Attributes, b: Attributes) => {
    let k: AttributeKey
    for (k in b) {
        if (k in a) {
            a[k] = (subtractors[k] as DynamicSubtractor)(a[k], b[k])
            if (a[k] === null) {
                delete a[k]
            }
        }
    }
    return a
}

export type AttributeSubtractor<k extends AttributeKey> = (
    a: Attribute<k>,
    b: Attribute<k>
) => Attribute<k> | null

const subtractDisjoint = <k extends DisjointKey>(
    a: Attribute<k>,
    b: Attribute<k>
) => (a === b ? null : a)

const subtractProps: AttributeSubtractor<"props"> = (a, b) => {
    for (const k in b) {
        if (k in a) {
            a[k] = subtract(a[k], b[k]) as any
            if (isEmpty(a[k])) {
                delete a[k]
            }
        }
    }
    return a
}

type DynamicSubtractor = AttributeSubtractor<any>

export const subtractors: {
    [k in AttributeKey]: AttributeSubtractor<k>
} = {
    type: subtractDisjoint<"type">,
    value: subtractDisjoint<"value">,
    alias: subtractKeysOrSets,
    contradiction: subtractKeysOrSets,
    requiredKeys: subtractKeySets,
    regex: subtractKeysOrSets<RegexLiteral>,
    divisor: subtractDivisors,
    bounds: subtractBounds,
    props: subtractProps,
    // TODO: Fix
    branches: (a) => a
}
