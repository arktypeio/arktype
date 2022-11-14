import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import type { keyOrSet, keySet, RegexLiteral } from "../../../utils/generics.js"
import type { SerializablePrimitive } from "../../../utils/primitiveSerialization.js"
import type { Attribute, AttributeKey, Attributes } from "./attributes.js"
import { boundsIntersection } from "./bounds.js"
import { divisorIntersection } from "./divisor.js"
import type { DeserializedAttribute, SerializedKey } from "./serialization.js"
import { deserializers, serializers } from "./serialization.js"

export const intersection = <k extends AttributeKey>(
    base: Attributes,
    k: k,
    v: Attribute<k>
): Attributes | null => {
    if (k === "branches") {
        return {}
    }
    if (base[k] === undefined) {
        base[k] = v
        return intersectImplications(base, k)
    }
    const isSerialized = k in serializers
    const baseValue = isSerialized
        ? deserializers[k as SerializedKey](base[k] as any)
        : base[k]
    // TODO: Remove!
    const result: any = intersections[k]!(baseValue, v as any)
    if (result === null) {
        return null
    } else {
        base[k] = isSerialized
            ? serializers[k as SerializedKey](result)
            : result
    }
    return base
}

const disjointIntersection = <t>(a: t, b: t) => (a === b ? a : null)

const keyOrSetIntersection = <k extends string = string>(
    a: keyOrSet<k>,
    b: keyOrSet<k>
): keyOrSet<k> => {
    if (typeof a === "string") {
        if (typeof b === "string") {
            return a === b ? a : ({ [a]: true, [b]: true } as keySet<k>)
        }
        b[a] = true
        return b
    }
    if (typeof b === "string") {
        a[b] = true
        return a
    }
    return keySetIntersection(a, b)
}

const keySetIntersection = <k extends string = string>(
    a: keySet<k>,
    b: keySet<k>
) => Object.assign(a, b)

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

const intersectImplications = (base: Attributes, k: AttributeKey) =>
    k === "bounds"
        ? intersection(base, "branches", [
              "?",
              "",
              "type",
              { number: {}, string: {}, array: {} }
          ])
        : k === "divisor"
        ? intersection(base, "type", "number")
        : base

type AttributeIntersections = {
    [k in AttributeKey]?: AttributeIntersection<k>
}

const intersections: AttributeIntersections = {
    type: disjointIntersection<DynamicTypeName>,
    value: disjointIntersection<SerializablePrimitive>,
    alias: keyOrSetIntersection,
    requiredKeys: keySetIntersection,
    regex: keyOrSetIntersection<RegexLiteral>,
    divisor: divisorIntersection,
    bounds: boundsIntersection
}
