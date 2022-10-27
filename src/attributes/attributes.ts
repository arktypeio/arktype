import type { dictionary } from "../internal.js"
import { reduceBound } from "./bound.js"
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
    type?: TypeAttribute
    value?: unknown
    // TODO: Multiple regex
    regex?: RegExp
    divisor?: number
    min?: number
    inclusiveMin?: boolean
    max?: number
    inclusiveMax?: boolean
    optional?: boolean
    branches?: Readonly<Attributes[]>
    props?: Readonly<dictionary<Attributes>>
    values?: Attributes
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
