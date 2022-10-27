import type { dictionary, DynamicTypeName, xor } from "../internal.js"
import type { Attributes } from "./attributes.js"
import type { Bounded } from "./bounded.js"
import type { TypeAttribute } from "./type.js"

export type InternalAttributeState = Readonly<Partial<AttributeTypes>>

export type AttributeTypes = {
    parent: Attributes
    children: Readonly<dictionary<Attributes>>
    typed: TypeAttribute
    equals: unknown
    // TODO: Multiple regex
    matches: RegExp
    divisible: number
    bounded: Bounded.Attribute
    optional: boolean
    branched: Readonly<Attributes[]>
}

export type AllowedImplications<key extends Attributes.KeyOf> =
    key extends "equals"
        ? never
        : key extends "typed"
        ? { readonly equals: unknown }
        : xor<{ readonly typed: DynamicTypeName }, { readonly equals: unknown }>

export type ReduceResult<key extends Attributes.KeyOf> =
    | "never"
    | [reducesTo?: AttributeTypes[key], implies?: AllowedImplications<key>]

export type Reducer<key extends Attributes.KeyOf> = (
    base: AttributeTypes[key] | undefined,
    value: AttributeTypes[key]
) => ReduceResult<key>
