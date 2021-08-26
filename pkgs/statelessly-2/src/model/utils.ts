import {
    Object as ToolbeltObject,
    Union as ToolbeltUnion,
    List as ToolbeltList,
    Any as ToolbeltAny,
    Function as ToolbeltFunction,
    T
} from "ts-toolbelt"

import {
    NonRecursible,
    Unlisted,
    KeyValuate,
    ExcludeCyclic,
    Join,
    NonObject
} from "@re-do/utils"

export type TypeError<Description extends string> = Description

export type ForceEvaluate<T, Deep extends boolean = true> = ToolbeltAny.Compute<
    T,
    Deep extends true ? "deep" : "flat"
>

export type Cast<A, B> = A extends B ? A : B

type NarrowRecurse<T> =
    | (T extends [] ? [] : never)
    | (T extends Narrowable ? T : never)
    | {
          [K in keyof T]: T[K] extends Function ? T[K] : Narrow<T[K]>
      }

type NarrowRoot<T, Narrowed = NarrowRecurse<T>> = Narrowed | Cast<T, Narrowed>

type Narrowable = string | number | bigint | boolean

export type Narrow<T> = NarrowRoot<T>

const narrow = <T>(t: Narrow<T>): T => [] as any as T

const f = narrow({
    z: (x: [1, "f", true, [3, "af"]]) => [true, false, ["a", 5]]
})

type ListPossibleTypesRecurse<
    U,
    LN extends any[] = [],
    LastU = ToolbeltUnion.Last<U>
> = {
    0: ListPossibleTypesRecurse<
        Exclude<U, LastU>,
        ToolbeltList.Prepend<LN, LastU>
    >
    1: LN
}[[U] extends [never] ? 1 : 0]

export type ListPossibleTypes<U> = ListPossibleTypesRecurse<U> extends infer X
    ? Cast<X, any[]>
    : never

export type StringifyPossibleTypes<U extends StringifiableType> = Join<
    ListPossibleTypes<U>,
    ", "
>

export type StringifyKeys<O> = StringifyPossibleTypes<
    keyof O & StringifiableType
>

export type StringifiableType =
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined

type ExactFunction<F extends Function, ExpectedType> = F extends (
    ...args: infer Args
) => infer Return
    ? ExpectedType extends (...args: infer ExpectedArgs) => infer ExpectedReturn
        ? (...args: Exact<Args, ExpectedArgs>) => Exact<Return, ExpectedReturn>
        : F
    : F

export type Exact<T, ExpectedType> = ExpectedType extends unknown
    ? T extends ExpectedType
        ? T extends NonObject
            ? T
            : T extends Function
            ? ExactFunction<T, ExpectedType>
            : {
                  [K in keyof T]: K extends keyof ExpectedType
                      ? Exact<T[K], ExpectedType[K]>
                      : TypeError<`Invalid property '${K &
                            (
                                | string
                                | number
                            )}'. Valid properties are: ${StringifyKeys<ExpectedType>}`>
              }
        : ExpectedType
    : TypeError<`ExpectedType didn't extend unknown.`>

const exact = <T>(t: Exact<T, { x: (_: string) => { a: 5 } }>) => {}

exact({ x: (_) => ({ a: 5 }) })

export type IsAny<T> = (any extends T ? true : false) extends true
    ? true
    : false
