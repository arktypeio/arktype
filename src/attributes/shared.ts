import type { dictionary, DynamicTypeName, xor } from "../internal.js"
import type { Attributes } from "./attributes.js"
import type { Bounded } from "./bounded.js"
import type { Typed } from "./typed.js"

export type InternalAttributeState = Readonly<Partial<AttributeTypes>>

export type AttributeTypes = {
    parent: Attributes
    props: Readonly<dictionary<Attributes>>
    children: Attributes
    typed: Typed.Attribute
    equals: unknown
    matches: string[]
    divisible: number
    bounded: Bounded.Attribute
    optional: boolean
    branched: Readonly<Attributes[]>
}

export type AttributeKey = keyof AttributeTypes

type AllowedImplications<key extends AttributeKey> = key extends "equals"
    ? never
    : key extends "typed"
    ? { readonly equals: unknown }
    : xor<{ readonly typed: DynamicTypeName }, { readonly equals: unknown }>

type AttributeReduceResult<key extends AttributeKey> =
    | [
          updatedValue?: AttributeTypes[key],
          implications?: AllowedImplications<key>
      ]
    | "never"

export type RootReducer = (
    base: Attributes,
    attributes: Attributes
) => Attributes | "never"

export type AttributeReducer<
    key extends AttributeKey,
    params extends unknown[] = [value: AttributeTypes[key]]
> = (
    base: AttributeTypes[key] | undefined,
    ...args: params
) => AttributeReduceResult<key>
