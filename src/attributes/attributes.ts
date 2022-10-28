import { isKeyOf } from "../internal.js"
import { Bounded } from "./bounded.js"
import { Divisible } from "./divisible.js"
import { Equals } from "./equals.js"
import { Intersection } from "./intersection.js"
import { Matches } from "./matches.js"
import type { InternalAttributeState } from "./shared.js"
import { Typed } from "./typed.js"
import { Union } from "./union.js"

declare const safe: unique symbol

type SafeProp = {
    readonly [safe]: never
}

type Safe<Type> = Type & SafeProp

export type Attributes = Safe<InternalAttributeState>

export namespace Attributes {
    export type With<requiredAttributes extends InternalAttributeState> =
        Safe<requiredAttributes>

    export const init = <key extends ReducibleKey>(
        key: key,
        input: ReducerInputs[key]
    ) => reduce({} as Attributes, key, input)

    export const initEmpty = () => ({} as Attributes)

    // TODO: Switch to just having these functions exposed directly.
    export const reduce = <key extends ReducibleKey>(
        base: Attributes,
        key: key,
        input: ReducerInputs[key]
    ) => {
        if (isKeyOf(key, attributeReducers)) {
            const result =
                key === "equals"
                    ? attributeReducers.equals(
                          base[key],
                          input,
                          "equals" in base
                      )
                    : attributeReducers[key](base[key] as any, input as any)
            return base
        }
        const result = rootReducers[key as RootReducerKey](
            base,
            input as ReducerInputs[RootReducerKey]
        )
        return base
    }

    const rootReducers = {
        union: Union.reduce,
        intersection: Intersection.reduce
    } as const

    type RootReducers = typeof rootReducers

    type RootReducerKey = keyof RootReducers

    const attributeReducers = {
        bounded: Bounded.reduce,
        divisible: Divisible.reduce,
        equals: Equals.reduce,
        matches: Matches.reduce,
        typed: Typed.reduce
    } as const

    type AttributeReducers = typeof attributeReducers

    type Reducers = RootReducers & AttributeReducers

    type ReducibleKey = keyof Reducers

    type ReducerInputs = {
        [k in keyof Reducers]: Parameters<Reducers[k]>[1]
    }
}
