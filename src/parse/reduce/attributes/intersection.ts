import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import type { RegexLiteral } from "../../../utils/generics.js"
import type { SerializablePrimitive } from "../../../utils/primitiveSerialization.js"
import type { Attribute, AttributeKey, Attributes } from "./attributes.js"
import { assignBoundsIntersection } from "./bounds.js"
import { applyBranchesIntersection } from "./branches.js"
import { applyDivisorIntersection } from "./divisor.js"
import {
    assignKeyOrSetIntersection,
    assignKeySetIntersection
} from "./keySets.js"
import { assignPropsIntersection } from "./props.js"

export const assignIntersection = (base: Attributes, assign: Attributes) => {
    let k: AttributeKey
    for (k in assign) {
        assignAttributeIntersection(base, k, assign[k] as any) as any
    }
    return base
}

export const assignAttributeIntersection = <k extends AttributeKey>(
    base: Attributes,
    k: k,
    v: Attribute<k>
) => {
    if (base[k] === undefined) {
        base[k] = v
        intersectImplications(base, k)
        return base
    }
    const result: any = intersections[k](base[k] as any, v as any)
    if (result === null) {
        assignAttributeIntersection(
            base,
            "contradiction",
            `${JSON.stringify(base[k])} and ${JSON.stringify(
                v
            )} have no overlap`
        )
    } else {
        base[k] = result
    }
    return base
}

export type AttributeIntersection<k extends AttributeKey> = (
    a: Attribute<k>,
    b: Attribute<k>
) => Attribute<k> | null

const intersectImplications = (base: Attributes, k: AttributeKey) =>
    k === "bounds"
        ? assignAttributeIntersection(base, "branches", {
              kind: "switch",
              path: "",
              key: "type",
              cases: { number: {}, string: {}, array: {} }
          })
        : k === "divisor"
        ? assignAttributeIntersection(base, "type", "number")
        : base

const applyDisjointIntersection = <t>(a: t, b: t) => (a === b ? a : null)

export const intersections: {
    [k in AttributeKey]: AttributeIntersection<k>
} = {
    type: applyDisjointIntersection<DynamicTypeName>,
    value: applyDisjointIntersection<SerializablePrimitive>,
    alias: assignKeyOrSetIntersection,
    contradiction: assignKeyOrSetIntersection,
    requiredKeys: assignKeySetIntersection,
    regex: assignKeyOrSetIntersection<RegexLiteral>,
    divisor: applyDivisorIntersection,
    bounds: assignBoundsIntersection,
    props: assignPropsIntersection,
    branches: applyBranchesIntersection
}
