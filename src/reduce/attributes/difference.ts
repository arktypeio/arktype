import type { RegexLiteral } from "../../operand/enclosed.js"
import { isEmpty } from "../../utils/deepEquals.js"
import type { DynamicTypeName } from "../../utils/dynamicTypes.js"
import type { keyOrSet, keySet } from "../../utils/generics.js"
import type { SerializablePrimitive } from "../../utils/primitiveSerialization.js"
import type { AttributeKey } from "./attributes.js"
import { divisorDifference } from "./divisor.js"
import type { DeserializedAttribute } from "./serialization.js"

export type AttributeDifference<k extends AttributeKey> = DifferenceOf<
    DeserializedAttribute<k>
>

export type DifferenceOf<t> = (a: t, b: t) => t | null

const disjointDifference = <t>(a: t, b: t) => (a === b ? null : a)

const keyOrSetDifference = <k extends string = string>(
    a: keyOrSet<k>,
    b: keyOrSet<k>
) => {
    if (typeof a === "string") {
        if (typeof b === "string") {
            return a === b ? null : a
        }
        return a in b ? null : a
    }
    if (typeof b === "string") {
        delete a[b]
        return isEmpty(a) ? null : a
    }
    return keySetDifference(a, b)
}

const keySetDifference = <k extends string = string>(
    a: keySet<k>,
    b: keySet<k>
) => {
    for (const k in b) {
        delete a[k]
    }
    return isEmpty(a) ? null : a
}

type AttributeDifferences = {
    [k in AttributeKey]?: AttributeDifference<k>
}

const differences: AttributeDifferences = {
    type: disjointDifference<DynamicTypeName>,
    value: disjointDifference<SerializablePrimitive>,
    alias: keyOrSetDifference,
    regex: keyOrSetDifference<RegexLiteral>,
    divisor: divisorDifference
}
