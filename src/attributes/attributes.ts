import type { EmptyObject, Evaluate } from "../internal.js"
import { Bounded } from "./bounded.js"
import { Divisible } from "./divisible.js"
import { Intersection } from "./intersection.js"
import type {
    AttributeTypes,
    InternalAttributeState,
    KeyReducer
} from "./shared.js"
import { Typed } from "./type.js"
import { Union } from "./union.js"

declare const safe: unique symbol

type SafeProp = {
    readonly [safe]: never
}

type Safe<Type> = Type & SafeProp

export type Attributes = Safe<InternalAttributeState>

export namespace Attributes {
    export type KeyOf = Evaluate<keyof InternalAttributeState>

    export type ReducerKey = Exclude<KeyOf, "parent" | "children" | "branched">

    export type With<requiredAttributes extends InternalAttributeState> =
        Safe<requiredAttributes>

    export const init = <key extends ReducerKey | "empty">(
        key: key,
        value: key extends ReducerKey ? AttributeTypes[key] : EmptyObject
    ) =>
        key === "empty"
            ? (value as Attributes)
            : reduce({} as Attributes, key, value)

    export const reduce = <key extends ReducerKey>(
        base: Attributes,
        key: key,
        value: AttributeTypes[key]
    ) => base

    const defineKeyReducers = <
        reducers extends {
            [key in KeyOf]?: KeyReducer<key>
        }
    >(
        reducers: reducers
    ) => reducers

    const rootReducers = {
        union: Union.reduce,
        intersection: Intersection.reduce
    }

    const keyReducers = defineKeyReducers({
        bounded: Bounded.reduce,
        divisible: Divisible.reduce,
        typed: Typed.reduce
    })
}
