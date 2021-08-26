import {
    Object as ToolbeltObject,
    Union as ToolbeltUnion,
    List as ToolbeltList,
    Any as ToolbeltAny
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

export type StringifyPossibleTypes<U extends string | number> = Join<
    ListPossibleTypes<U>,
    ", "
>

export type Exact<T, ExpectedType> = ExpectedType extends unknown
    ? T extends ExpectedType
        ? T extends NonRecursible
            ? T
            : // T extends (...args: infer Args) => infer Return
              //             ? (
              //                   ...args: Exact<
              //                       Args,
              //                       Parameters<ExpectedType & ((...args: any[]) => any)>
              //                   >
              //               ) => Exact<
              //                   Return,
              //                   ReturnType<ExpectedType & ((...args: any[]) => any)>
              //               > :
              {
                  [K in keyof T]: K extends keyof ExpectedType
                      ? Exact<T[K], ExpectedType[K]>
                      : TypeError<`Invalid property '${K &
                            (
                                | string
                                | number
                            )}'. Valid properties are: ${StringifyPossibleTypes<
                            keyof ExpectedType & (string | number)
                        >}`>
              }
        : ExpectedType
    : never
