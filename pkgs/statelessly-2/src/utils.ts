import {
    Object as ToolbeltObject,
    Union as ToolbeltUnion,
    List as ToolbeltList,
    Any as ToolbeltAny,
    Function as ToolbeltFunction,
    A
} from "ts-toolbelt"

import {
    NonRecursible,
    Join,
    NonObject,
    SimpleFunction,
    IsAnyOrUnknown,
    Cast
} from "@re-do/utils"

export type TypeError<Description extends string> = Description

export type ForceEvaluate<T, Deep extends boolean = true> = ToolbeltAny.Compute<
    T,
    Deep extends true ? "deep" : "flat"
>

export type Recursible<T> = T extends NonRecursible ? never : T

type NarrowRecurse<T> =
    | (T extends NonRecursible ? T : never)
    | {
          [K in keyof T]:
              | (IsAnyOrUnknown<T[K]> extends true ? T[K] : never)
              | NarrowRecurse<T[K]>
      }

export type Narrow<T> = Cast<T, NarrowRecurse<T>>

const narrow = <T>(t: Narrow<T>): T => [] as any

const result = narrow({
    users: {
        defines: "user",
        fields: {
            name: {
                type: "string",
                onChange: {} as unknown
            }
        }
    },
    groups: {
        defines: "group",
        fields: {
            name: {
                type: "string",
                onChange: () => ""
            }
        }
    }
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
    O extends any[] ? keyof O & number : keyof O & string
>

export type StringifiableType =
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined

export type ExtractFunction<T> = Extract<T, SimpleFunction>

export type ExactFunction<T, ExpectedType> = T extends ExpectedType
    ? ExtractFunction<T> extends (...args: infer Args) => infer Return
        ? ExtractFunction<ExpectedType> extends (
              ...args: infer ExpectedArgs
          ) => infer ExpectedReturn
            ? (
                  ...args: Exact<Args, ExpectedArgs>
              ) => Exact<Return, ExpectedReturn>
            : ExpectedType
        : ExpectedType
    : ExpectedType

export type Exact<T, ExpectedType> = IsAnyOrUnknown<T> extends true
    ? ExpectedType
    : T extends ExpectedType
    ? T extends NonObject
        ? T
        : {
              [K in keyof T]: K extends keyof Recursible<ExpectedType>
                  ? Exact<T[K], Recursible<ExpectedType>[K]>
                  : TypeError<`Invalid property '${Extract<
                        K,
                        string | number
                    >}'. Valid properties are: ${StringifyKeys<ExpectedType>}`>
          }
    : ExpectedType
