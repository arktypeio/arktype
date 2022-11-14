import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import type { keyOrSet, keySet, RegexLiteral } from "../../../utils/generics.js"
import type { SerializablePrimitive } from "../../../utils/primitiveSerialization.js"
import type { Attribute, AttributeKey, Attributes } from "./attributes.js"
import { boundsIntersection } from "./bounds.js"
import { divisorIntersection } from "./divisor.js"
import type { DeserializedAttribute, SerializedKey } from "./serialization.js"
import { deserializers, serializers } from "./serialization.js"

export const intersection = (
    base: Attributes,
    assign: Attributes
): Attributes | null => {
    let k: AttributeKey
    for (k in assign) {
        const result = keyIntersection(base, k, assign[k] as any)
        if (result === null) {
            return null
        }
        base[k] = result as any
    }
    return base
}

export const keyIntersection = <k extends AttributeKey>(
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
