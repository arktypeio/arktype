import type { dictionary, DynamicTypeName } from "../../utils/dynamicTypes.js"
import type { evaluate, subtype } from "../../utils/generics.js"
import type { NumberLiteral } from "../../utils/numericLiterals.js"
import type { Enclosed } from "../operand/enclosed.js"
import type { BoundsString } from "../operator/bounds/shared.js"
import type { SerializedPrimitive } from "./value.js"

type ReducibleAttributes = subtype<
    dictionary<string>,
    {
        readonly value?: SerializedPrimitive
        readonly type?: TypeAttributeName
        readonly divisor?: NumberLiteral
        readonly bounds?: BoundsString
    }
>

type IrreducibleAttributes = subtype<
    dictionary<string>,
    {
        readonly regex?: Enclosed.RegexLiteral
        readonly requiredKey?: string
        readonly alias?: string
        readonly contradiction?: string
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

export type TypeAttributeName = Exclude<DynamicTypeName, "undefined" | "null">

export type keySet<key extends string> = { [_ in key]?: true }

export type keyOrKeySet<key extends string> = key | keySet<key>

export const atomicAttributes: Required<keySet<AtomicKey>> = {
    value: true,
    type: true,
    divisor: true,
    regex: true,
    bounds: true,
    requiredKey: true,
    alias: true,
    contradiction: true
}

export type AtomicKey = keyof AtomicAttributes
