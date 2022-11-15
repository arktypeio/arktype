import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import type { RegexLiteral } from "../../../utils/generics.js"
import type { SerializablePrimitive } from "../../../utils/primitiveSerialization.js"
import type { Attribute, AttributeKey, Attributes } from "./attributes.js"
import { applyBoundsOperation } from "./bounds.js"
import { applyDivisorOperation } from "./divisor.js"
import { applyKeyOrSetOperation, applyKeySetOperation } from "./keySets.js"
import type { DeserializedAttribute, SerializedKey } from "./serialization.js"
import { deserializers, serializers } from "./serialization.js"

export const applyOperation = (
    operator: AttributeOperator,
    base: Attributes,
    assign: Attributes
): Attributes | null => {
    let k: AttributeKey
    for (k in assign) {
        const result = applyOperationToKey(operator, base, k, assign[k] as any)
        if (result === null) {
            return null
        }
        base[k] = result as any
    }
    return base
}

const applyOperationToKey = <k extends AttributeKey>(
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
    // TODO: Remove non-null assertion
    const result: any = operations[k]!(operator, baseValue, v as any)
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

export type AttributeOperation<k extends AttributeKey> = OperationOf<
    DeserializedAttribute<k>
>

type OperationOf<t> = (operator: AttributeOperator, a: t, b: t) => t | null

const intersectImplications = (base: Attributes, k: AttributeKey) =>
    k === "bounds"
        ? applyOperationToKey("&", base, "branches", [
              "?",
              "",
              "type",
              { number: {}, string: {}, array: {} }
          ])
        : k === "divisor"
        ? applyOperationToKey("&", base, "type", "number")
        : base

type AttributeOperations = {
    [k in AttributeKey]?: AttributeOperation<k>
}

const applyDisjointOperation = <t>(operator: AttributeOperator, a: t, b: t) =>
    operator === "&" ? (a === b ? a : null) : a === b ? null : a

export const operations: AttributeOperations = {
    type: applyDisjointOperation<DynamicTypeName>,
    value: applyDisjointOperation<SerializablePrimitive>,
    alias: applyKeyOrSetOperation,
    requiredKeys: applyKeySetOperation,
    regex: applyKeyOrSetOperation<RegexLiteral>,
    divisor: applyDivisorOperation,
    bounds: applyBoundsOperation
}
