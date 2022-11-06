import type { dictionary, DynamicTypeName } from "../../utils/dynamicTypes.js"
import type { keyOrKeySet, keySet, subtype } from "../../utils/generics.js"
import type { NumberLiteral } from "../../utils/numericLiterals.js"
import type { Enclosed } from "../operand/enclosed.js"
import type { BoundsString } from "../operator/bounds/shared.js"
import type { SerializedPrimitive } from "./value.js"

type ReducibleAttributeTypes = subtype<
    dictionary<string>,
    {
        value: SerializedPrimitive
        type: TypeAttribute
        divisor: NumberLiteral
        bounds: BoundsString
    }
>

type IrreducibleAttributeTypes = subtype<
    dictionary<keyOrKeySet<string>>,
    {
        regex: keyOrKeySet<Enclosed.RegexLiteral>
        requiredKeys: keySet<string>
        alias: keyOrKeySet<string>
        contradiction: keyOrKeySet<string>
    }
>

type ComposedAttributeTypes = {
    parent: Attributes
    baseProp: Attributes
    paths: Readonly<dictionary<Attributes>>
    branches: AttributeBranches
}

export type AttributeBranches = readonly [
    path: string,
    attributesOrBranches: {
        readonly [k in string]: Attributes | AttributeBranches
    }
]

export type AttributeTypes = ReducibleAttributeTypes &
    IrreducibleAttributeTypes &
    ComposedAttributeTypes

export type AttributeKey = keyof AttributeTypes

export type Attributes = { readonly [k in AttributeKey]?: AttributeTypes[k] }

export type TypeAttribute = DynamicTypeName
