import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import { isKeyOf } from "../../../utils/generics.js"
import type { DiscriminatedBranches } from "../../operator/union/discriminate.js"
import type { Attribute, AttributeKey, Attributes } from "./attributes.js"
import { operateAttribute } from "./operations.js"

export const intersectKey = <k extends AttributeKey>(
    attributes: Attributes,
    k: k,
    v: Attribute<k>
): Attributes => {
    if (k === "branches") {
        return {}
    } else if (attributes[k] === undefined) {
        attributes[k] = v
        if (isKeyOf(k, impliedTypes)) {
            addImpliedType(attributes, k)
        }
    } else {
        const result = (operateAttribute[k] as any)(attributes[k], v)
        if (result === null) {
            intersectKey(
                attributes,
                "contradiction",
                `${attributes[k]} and ${v} have an empty intersection`
            )
        } else {
            attributes[k] = result
        }
    }
    return attributes
}

export const intersect = (a: Attributes, b: Attributes): Attributes => {
    let k: AttributeKey
    for (k in b) {
        intersectKey(a, k, b[k] as any)
    }
    return a
}

type TypeImplyingKey = "divisor" | "regex" | "bounds"

const addImpliedType = (attributes: Attributes, key: TypeImplyingKey) => {
    const impliedType = impliedTypes[key]
    typeof impliedType === "string"
        ? intersectKey(attributes, "type", impliedType)
        : intersectKey(attributes, "branches", ["?", "", "type", impliedType()])
}

const impliedTypes: {
    [k in TypeImplyingKey]:
        | DynamicTypeName
        | (() => DiscriminatedBranches<"type">[3])
} = {
    divisor: "number",
    bounds: () => ({
        number: {},
        string: {},
        array: {}
    }),
    regex: "string"
}
