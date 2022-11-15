import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import type { RegexLiteral } from "../../../utils/generics.js"
import type { SerializablePrimitive } from "../../../utils/primitiveSerialization.js"
import type { Attribute, AttributeKey, Attributes } from "./attributes.js"
import { applyBoundsOperation } from "./bounds.js"
import { applyBranchesOperation } from "./branches.js"
import { applyDivisorOperation } from "./divisor.js"
import { applyKeyOrSetOperation, applyKeySetOperation } from "./keySets.js"
import { applyPropsOperation } from "./props.js"
import type { DeserializedAttribute, SerializedKey } from "./serialization.js"
import { deserializers, serializers } from "./serialization.js"

export const applyOperation = (
    operator: AttributeOperator,
    base: Attributes,
    assign: Attributes
): Attributes | null => {
    let k: AttributeKey
    for (k in assign) {
        base[k] = applyOperationAtKey(
            operator,
            base,
            k,
            assign[k] as any
        ) as any
    }
    return base
}

// TODO: Refactor, split into serialization wrapper
// eslint-disable-next-line max-lines-per-function
export const applyOperationAtKey = <k extends AttributeKey>(
    operator: AttributeOperator,
    base: Attributes,
    k: k,
    v: Attribute<k>
): Attributes | null => {
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
    const result: any = operations[k](operator, baseValue, v as any)
    if (result === null) {
        if (operator === "&") {
            applyOperationAtKey(
                "&",
                base,
                "contradiction",
                `${JSON.stringify(baseValue)} and ${JSON.stringify(
                    v
                )} have no overlap`
            )
            return base
        }
        delete base[k]
        return base
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
        ? applyOperationAtKey("&", base, "branches", {
              kind: "switch",
              path: "",
              key: "type",
              cases: { number: {}, string: {}, array: {} }
          })
        : k === "divisor"
        ? applyOperationAtKey("&", base, "type", "number")
        : base

const applyDisjointOperation = <t>(operator: AttributeOperator, a: t, b: t) =>
    operator === "&" ? (a === b ? a : null) : a === b ? null : a

export const operations: {
    [k in AttributeKey]: AttributeOperation<k>
} = {
    type: applyDisjointOperation<DynamicTypeName>,
    value: applyDisjointOperation<SerializablePrimitive>,
    alias: applyKeyOrSetOperation,
    contradiction: applyKeyOrSetOperation,
    requiredKeys: applyKeySetOperation,
    regex: applyKeyOrSetOperation<RegexLiteral>,
    divisor: applyDivisorOperation,
    bounds: applyBoundsOperation,
    props: applyPropsOperation,
    branches: applyBranchesOperation
}
