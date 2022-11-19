import type { RegexLiteral } from "../../../utils/generics.js"
import type {
    Attribute,
    AttributeKey,
    Attributes,
    BranchedAttributes
} from "./attributes.js"
import { assignBoundsIntersection } from "./bounds.js"
import { applyBranchesIntersection } from "./branches.js"
import { Contradiction } from "./contradiction.js"
import { applyDivisorIntersection } from "./divisor.js"
import {
    assignKeyOrSetIntersection,
    assignKeySetIntersection
} from "./keySets.js"
import { assignPropsIntersection } from "./props.js"
import { pruneBranches } from "./union/prune.js"

export const assignIntersection = (base: Attributes, assign: Attributes) => {
    if (base.branches) {
        pruneBranches(base as BranchedAttributes, assign)
    }
    if (assign.branches) {
        pruneBranches(assign as BranchedAttributes, base)
    }
    let k: AttributeKey
    for (k in assign) {
        if (base[k] === undefined) {
            base[k] = assign[k] as any
            intersectImplications(base, k)
        }
        const result = (intersections[k] as DynamicIntersection)(
            base[k],
            assign[k]
        )
        // TODO: Figure out branch/props contradictions here
        if (result === null) {
            assignIntersection(base, {
                contradiction: buildNonOverlappingMessage(base[k], assign[k])
            })
        } else {
            base[k] = result
        }
    }
    return base
}

export const buildNonOverlappingMessage = (a: unknown, b: unknown) =>
    `${JSON.stringify(a)} and ${JSON.stringify(b)} have no overlap`

export type AttributeIntersection<k extends AttributeKey> = (
    a: Attribute<k>,
    b: Attribute<k>
) => Attribute<k> | Contradiction

const intersectImplications = (base: Attributes, k: AttributeKey) =>
    k === "bounds"
        ? assignIntersection(base, {
              branches: ["?", "type", { number: {}, string: {}, array: {} }]
          })
        : k === "divisor"
        ? assignIntersection(base, { type: "number" })
        : base

const applyTypeIntersection: AttributeIntersection<"type"> = (a, b) =>
    a === b
        ? a
        : new Contradiction(`types ${a} and ${b} are mutually exclusive`)

const applyValueIntersection: AttributeIntersection<"value"> = (a, b) =>
    a === b
        ? a
        : new Contradiction(`values ${a} and ${b} are mutually exclusive`)

type DynamicIntersection = AttributeIntersection<any>

export const intersections: {
    [k in AttributeKey]: AttributeIntersection<k>
} = {
    type: applyTypeIntersection,
    value: applyValueIntersection,
    alias: assignKeyOrSetIntersection,
    contradiction: assignKeyOrSetIntersection,
    requiredKeys: assignKeySetIntersection,
    regex: assignKeyOrSetIntersection<RegexLiteral>,
    divisor: applyDivisorIntersection,
    bounds: assignBoundsIntersection,
    props: assignPropsIntersection,
    branches: applyBranchesIntersection
}
