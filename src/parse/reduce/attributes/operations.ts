import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import type { RegexLiteral } from "../../../utils/generics.js"
import type { SerializablePrimitive } from "../../../utils/primitiveSerialization.js"
import type { Attribute, AttributeKey, Attributes } from "./attributes.js"
import { boundsIntersection } from "./bounds.js"
import { divisorDifference, divisorIntersection } from "./divisor.js"
import {
    keyOrSetDifference,
    keyOrSetIntersection,
    keySetIntersection
} from "./keySets.js"
import type { DeserializedAttribute, SerializedKey } from "./serialization.js"
import { deserializers, serializers } from "./serialization.js"

const operation = (
    operator: AttributeOperator,
    base: Attributes,
    assign: Attributes
): Attributes | null => {
    let k: AttributeKey
    for (k in assign) {
        const result = keyOperation(operator, base, k, assign[k] as any)
        if (result === null) {
            return null
        }
        base[k] = result as any
    }
    return base
}

const keyOperation = <k extends AttributeKey>(
    operator: AttributeOperator,
    base: Attributes,
    k: k,
    v: Attribute<k>
): Attributes | null => {
    if (k === "branches") {
        return base
    }
    if (base[k] === undefined) {
        if (operator === "&") {
            base[k] = v
            return intersectImplications(base, k)
        }
        return base
    }
    const isSerialized = k in serializers
    const baseValue = isSerialized
        ? deserializers[k as SerializedKey](base[k] as any)
        : base[k]

    const operations = operator === "&" ? intersections : differences
    // TODO: Remove non-null assertion
    const result: any = operations[k]!(baseValue, v as any)
    if (result === null) {
        return null
    } else {
        base[k] = isSerialized
            ? serializers[k as SerializedKey](result)
            : result
    }
    return base
}

export type AttributeOperator = "&" | "-"

type KeyWithDisjoinableIntersection =
    | "type"
    | "value"
    | "bounds"
    | "props"
    | "branches"

export type AttributeIntersection<k extends AttributeKey> = IntersectionOf<
    DeserializedAttribute<k>,
    k extends KeyWithDisjoinableIntersection ? null : never
>

export type IntersectionOf<t, additionalResultTypes = never> = (
    a: t,
    b: t
) => t | additionalResultTypes

export type AttributeDifference<k extends AttributeKey> = DifferenceOf<
    DeserializedAttribute<k>
>

export type DifferenceOf<t> = (a: t, b: t) => t | null

const intersectImplications = (base: Attributes, k: AttributeKey) =>
    k === "bounds"
        ? keyOperation("&", base, "branches", [
              "?",
              "",
              "type",
              { number: {}, string: {}, array: {} }
          ])
        : k === "divisor"
        ? keyOperation("&", base, "type", "number")
        : base

type AttributeIntersections = {
    [k in AttributeKey]?: AttributeIntersection<k>
}

const disjointIntersection = <t>(a: t, b: t) => (a === b ? a : null)

export const intersections: AttributeIntersections = {
    type: disjointIntersection<DynamicTypeName>,
    value: disjointIntersection<SerializablePrimitive>,
    alias: keyOrSetIntersection,
    requiredKeys: keySetIntersection,
    regex: keyOrSetIntersection<RegexLiteral>,
    divisor: divisorIntersection,
    bounds: boundsIntersection
}

type AttributeDifferences = {
    [k in AttributeKey]?: AttributeDifference<k>
}

const disjointDifference = <t>(a: t, b: t) => (a === b ? null : a)

export const differences: AttributeDifferences = {
    type: disjointDifference<DynamicTypeName>,
    value: disjointDifference<SerializablePrimitive>,
    alias: keyOrSetDifference,
    regex: keyOrSetDifference<RegexLiteral>,
    divisor: divisorDifference
}
