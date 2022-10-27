import type { dictionary } from "../internal.js"
import type { BoundsAttribute } from "./bounds.js"
import { reduceDivisibility } from "./divisibility.js"
import { reduceIntersection } from "./intersection.js"
import { reduceNoop } from "./noop.js"
import { reduceOptionality } from "./optionality.js"
import { reduceProp } from "./prop.js"
import { reduceRegex } from "./regex.js"
import { reduceType } from "./type.js"
import type { TypeAttribute } from "./type.js"
import { reduceUnion } from "./union.js"
import { reduceValue } from "./value.js"

declare const safe: unique symbol

type SafeProp = {
    readonly [safe]: never
}

type Safe<Type> = Type & SafeProp

type InternalAttributes = Readonly<{
    parent?: Attributes
    children?: Readonly<dictionary<Attributes>>
    hasType?: TypeAttribute
    equals?: unknown
    // TODO: Multiple regex
    matchesRegex?: RegExp
    isDivisibleBy?: number
    isBoundedBy?: BoundsAttribute
    isOptional?: boolean
    satisfiesOneOf?: Readonly<Attributes[]>
}>

export type Attributes = Safe<InternalAttributes>

export namespace Attributes {
    export type KeyOf = keyof InternalAttributes

    export type With<requiredAttributes extends InternalAttributes> =
        Safe<requiredAttributes>

    export const init = <key extends ReducerKey>(
        key: key,
        ...args: ReducerParams[key]
    ) => reduce(key, {} as Attributes, ...args)

    export const reduce = <key extends ReducerKey>(
        key: key,
        base: Attributes,
        ...args: ReducerParams[key]
    ) =>
        // @ts-expect-error (rest args are fine here)
        reducers[key](base, ...args)

    export type ReduceResult<key extends KeyOf> =
        | (Attributes & {
              [_ in key]: Attributes[key] | "never"
          })
        | null

    const defineReducers = (reducers: {
        [key in KeyOf]: (
            base: Attributes[key],
            value: Attributes[key]
        ) => ReduceResult<key>
    }) => reducers

    const reducers = {
        bound: reduceBound,
        divisibility: reduceDivisibility,
        intersection: reduceIntersection,
        noop: reduceNoop,
        optional: reduceOptionality,
        prop: reduceProp,
        regex: reduceRegex,
        type: reduceType,
        union: reduceUnion,
        value: reduceValue
    }

    export type Reducer<params extends unknown[]> = (
        base: Attributes,
        ...args: params
    ) => Attributes

    type Reducers = typeof reducers

    type ReducerKey = keyof Reducers

    type ReducerParams = {
        [key in ReducerKey]: Reducers[key] extends Reducer<infer params>
            ? params
            : never
    }
}
