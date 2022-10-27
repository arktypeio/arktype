import { Bounded } from "./bounded.js"
import { Divisible } from "./divisibility.js"
import type { InternalAttributeState, Reducer } from "./shared.js"

declare const safe: unique symbol

type SafeProp = {
    readonly [safe]: never
}

type Safe<Type> = Type & SafeProp

export type Attributes = Safe<InternalAttributeState>

export namespace Attributes {
    export type KeyOf = keyof InternalAttributeState

    export type With<requiredAttributes extends InternalAttributeState> =
        Safe<requiredAttributes>

    // export const init = <key extends ReducerKey>(
    //     key: key,
    //     ...args: ReducerParams[key]
    // ) => reduce(key, {} as Attributes, ...args)

    // export const reduce = <key extends ReducerKey>(
    //     key: key,
    //     base: Attributes,
    //     ...args: ReducerParams[key]
    // ) =>
    //     // @ts-expect-error (rest args are fine here)
    //     reducers[key](base, ...args)

    const defineReducers = <
        reducers extends {
            [key in KeyOf]?: Reducer<key>
        }
    >(
        reducers: reducers
    ) => reducers

    const reducers = defineReducers({
        bounded: Bounded.reduce,
        divisible: Divisible.reduce
    })

    // export type ReduceResult<key extends KeyOf> =
    //     | Attributes[key]
    //     | dynamicNever
    //     | dynamicNoop

    // const defineReducers = <
    //     reducers extends {
    //         [key in KeyOf]: (
    //             base: Attributes[key],
    //             value: Attributes[key]
    //         ) => ReduceResult<key>
    //     }
    // >(
    //     reducers: reducers
    // ) => reducers

    // const defineImplicators = <
    //     implicators extends {
    //         [key in KeyOf]: (base: Attributes[key]) => ReduceResult<key>
    //     }
    // >(
    //     implicators: implicators
    // ) => implicators
    // export type Reducer<params extends unknown[]> = (
    //     base: Attributes,
    //     ...args: params
    // ) => Attributes
}
