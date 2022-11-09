import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import type { defined, keyOrKeySet, keySet } from "../../../utils/generics.js"
import { isKeyOf } from "../../../utils/generics.js"
import type {
    AttributeBranches,
    AttributeCases,
    AttributeKey,
    Attributes,
    AttributeTypes,
    DisjointKey
} from "../../state/attributes.js"
import { intersectBounds } from "../bounds/shared.js"
import { intersectDivisors } from "../divisor.js"

export const add = <k extends AttributeKey>(
    attributes: Attributes,
    k: k,
    v: AttributeTypes[k]
): Attributes => {
    if (k === "branches") {
        return {}
    } else if (attributes[k] === undefined) {
        attributes[k] = v
        if (isKeyOf(k, impliedTypes)) {
            addImpliedType(attributes, k)
        }
    } else {
        const result = (contextFreeIntersectors as any)[k](attributes[k], v)
        if (result === null) {
            attributes.contradiction = `${JSON.stringify(
                attributes[k]
            )} and ${JSON.stringify(v)} have an empty intersection`
        } else {
            attributes[k] = result
        }
    }
    return attributes
}

const addKeyToBranches = <k extends AttributeKey>(
    branches: AttributeBranches,
    k: k,
    v: AttributeTypes[k]
) => {
    if (branches[0] === "?") {
        if (k === branches[2]) {
            const disjointValue = v as AttributeTypes[DisjointKey]
            if (disjointValue in branches[3]) {
            }
        }
    }
}

export const compileIntersection = (branches: Attributes[]) => {
    while (branches.length > 1) {
        branches.unshift(intersect(branches.pop()!, branches.pop()!))
    }
    return branches[0]
}

const intersect = (a: Attributes, b: Attributes): Attributes => {
    let k: AttributeKey
    for (k in b) {
        add(a, k, b[k] as any)
    }
    return a
}

const intersectIrreducibleAttribute = <t extends string>(
    a: keyOrKeySet<t>,
    b: keyOrKeySet<t>
): keyOrKeySet<t> => {
    if (typeof a === "string") {
        if (typeof b === "string") {
            return a === b ? a : ({ [a]: true, [b]: true } as keySet<t>)
        }
        b[a] = true
        return b
    }
    if (typeof b === "string") {
        a[b] = true
        return a
    }
    return Object.assign(a, b)
}

const intersectDisjointAttribute = <value extends string>(a: value, b: value) =>
    a === b ? a : null

type NonBranchingKey = Exclude<AttributeKey, "branches">

type ContextFreeIntersectors = {
    [k in NonBranchingKey]: Intersector<k>
}

const contextFreeIntersectors: ContextFreeIntersectors = {
    value: intersectDisjointAttribute,
    type: intersectDisjointAttribute,
    requiredKeys: (a, b) => Object.assign(a, b),
    alias: intersectIrreducibleAttribute,
    contradiction: intersectIrreducibleAttribute,
    divisor: (a, b) => intersectDivisors(a, b),
    regex: (a, b) => intersectIrreducibleAttribute(a, b),
    bounds: intersectBounds,
    props: (a, b) => {
        for (const k in a) {
            if (k in b) {
                b[k] = intersect(a[k], b[k])
            }
        }
        return Object.assign(a, b)
    }
}

type TypeImplyingKey = "divisor" | "regex" | "bounds"

const addImpliedType = (attributes: Attributes, key: TypeImplyingKey) => {
    const impliedType = impliedTypes[key]
    typeof impliedType === "string"
        ? add(attributes, "type", impliedType)
        : add(attributes, "branches", ["?", "", "type", impliedType()])
}

const impliedTypes: {
    [k in TypeImplyingKey]: DynamicTypeName | (() => AttributeCases<"type">)
} = {
    divisor: "number",
    bounds: () => ({
        number: {},
        string: {},
        array: {}
    }),
    regex: "string"
}

export type Intersector<k extends AttributeKey> = (
    a: defined<Attributes[k]>,
    b: defined<Attributes[k]>
) => defined<Attributes[k]> | null
