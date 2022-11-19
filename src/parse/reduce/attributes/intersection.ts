import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import type { RegexLiteral } from "../../../utils/generics.js"
import type { SerializedPrimitive } from "../../../utils/primitiveSerialization.js"
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
        if (base[k] === undefined) {
            base[k] = assign[k] as any
            intersectImplications(base, k)
            return base
        }
        const result = (intersections[k] as DynamicIntersection)(
            base[k],
            assign[k]
        )
        if (result === null) {
            assignNonOverlappingContradiction(base, base[k], assign[k])
        } else {
            base[k] = result
        }
        return base
    }
    return base
}

export const assignNonOverlappingContradiction = (
    base: Attributes,
    a: unknown,
    b: unknown
) =>
    assignIntersection(base, {
        contradiction: `${JSON.stringify(a)} and ${JSON.stringify(
            b
        )} have no overlap`
    })

export type AttributeIntersection<k extends AttributeKey> = (
    a: Attribute<k>,
    b: Attribute<k>
) => Attribute<k> | null

const intersectImplications = (base: Attributes, k: AttributeKey) =>
    k === "bounds"
        ? assignIntersection(base, {
              branches: ["?", "type", { number: {}, string: {}, array: {} }]
          })
        : k === "divisor"
        ? assignIntersection(base, { type: "number" })
        : base

const applyDisjointIntersection = <t>(a: t, b: t) => (a === b ? a : null)

type DynamicIntersection = AttributeIntersection<any>

export const intersections: {
    [k in AttributeKey]: AttributeIntersection<k>
} = {
    type: applyDisjointIntersection<DynamicTypeName>,
    value: applyDisjointIntersection<SerializedPrimitive>,
    alias: assignKeyOrSetIntersection,
    contradiction: assignKeyOrSetIntersection,
    requiredKeys: assignKeySetIntersection,
    regex: assignKeyOrSetIntersection<RegexLiteral>,
    divisor: applyDivisorIntersection,
    bounds: assignBoundsIntersection,
    props: assignPropsIntersection,
    branches: applyBranchesIntersection
}
