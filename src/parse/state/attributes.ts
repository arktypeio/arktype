import type { dictionary, DynamicTypeName } from "../../utils/dynamicTypes.js"
import type {
    evaluate,
    keyOrKeySet,
    keySet,
    subtype
} from "../../utils/generics.js"
import type { NumberLiteral } from "../../utils/numericLiterals.js"
import type { Enclosed } from "../operand/enclosed.js"
import type { BoundsString } from "../operator/bounds/shared.js"
import type { SerializedPrimitive } from "./value.js"

type ReducibleAttributes = subtype<
    dictionary<string>,
    {
        readonly value?: SerializedPrimitive
        readonly type?: TypeAttribute
        readonly divisor?: NumberLiteral
        readonly bounds?: BoundsString
    }
>

type IrreducibleAttributes = subtype<
    dictionary<keyOrKeySet<string>>,
    {
        readonly regex?: keyOrKeySet<Enclosed.RegexLiteral>
        readonly requiredKeys?: keySet<string>
        readonly alias?: keyOrKeySet<string>
        readonly contradiction?: keyOrKeySet<string>
    }
>

type AtomicAttributes = evaluate<ReducibleAttributes & IrreducibleAttributes>

type ComposedAttributes = {
    readonly parent?: Attributes
    readonly baseProp?: Attributes
    readonly props?: Readonly<dictionary<Attributes>>
    readonly branches?: AttributeBranches
}

export type AttributeBranches = readonly [
    path: string,
    attributesOrBranches: {
        readonly [k in string]: Attributes | AttributeBranches
    }
]

export type Attributes = AtomicAttributes & ComposedAttributes

export type AttributeKey = keyof Attributes

export type TypeAttribute = Exclude<DynamicTypeName, "undefined" | "null">
