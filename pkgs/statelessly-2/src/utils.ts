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
    Unlisted,
    KeyValuate,
    ExcludeCyclic,
    Join,
    NonObject,
    SimpleFunction,
    Not
} from "@re-do/utils"

export type TypeError<Description extends string> = Description

export type ForceEvaluate<T, Deep extends boolean = true> = ToolbeltAny.Compute<
    T,
    Deep extends true ? "deep" : "flat"
>

export type Cast<A, B> = A extends B ? A : B

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

type ExtractFunction<T> = Extract<T, SimpleFunction>

type z = ExactFunction<(_: unknown) => {}, () => {}>

type oifdsh = InferFunction<(_: unknown) => {}>
type Oz = InferFunction<() => {}>

type fdsoih = Exact<[], [_: unknown]>

type foodfd = Recursible<[_: unknown]>

type InferFunction<T> = ExtractFunction<T> extends (
    ...args: infer Args
) => infer Return
    ? [Args, Return]
    : never

type ExactFunction<T, ExpectedType> = ExtractFunction<T> extends (
    ...args: infer Args
) => infer Return
    ? ExtractFunction<ExpectedType> extends (
          ...args: infer ExpectedArgs
      ) => infer ExpectedReturn
        ? (...args: Exact<Args, ExpectedArgs>) => Exact<Return, ExpectedReturn>
        : ExpectedType
    : ExpectedType

export type Exact<T, ExpectedType> = IsAnyOrUnknown<T> extends true
    ? ExpectedType
    : T extends NonObject
    ? T extends ExpectedType
        ? T
        : ExpectedType
    : T extends SimpleFunction
    ? ExactFunction<T, ExpectedType>
    : {
          [K in keyof T]: K extends keyof Recursible<ExpectedType>
              ? Exact<T[K], Recursible<ExpectedType>[K]>
              : TypeError<`Invalid property '${Extract<
                    K,
                    string | number
                >}'. Valid properties are: ${StringifyKeys<ExpectedType>}`>
      }

const ex = <A, B>(a: A, b: B) => [] as any as Exact<A, B>
const result3 = ex(
    {
        a: (a: { a: 1; b: 2 }) => {}
    },
    {
        a: (a: { a: number }) => {}
    }
)

type Ref<T> = {
    [K in keyof T]: {
        x?: { a?: (_: string) => { a: number } }
        y?: { a?: (_: string) => { a: number } }
        b: string
    }
}

const exact = <T>(t: Exact<T, Ref<T>>) => [] as any as T

type Z = Exact<() => { a: 5 }, (_: string) => { a: number }>

const t = exact({
    shmope: {
        x: { a: (_: string) => ({ a: 5 }) },
        y: { a: (_: string) => ({ a: 5 }) },
        b: "narrow"
    },
    brope: {
        x: { a: (_: string) => ({ a: 5 }) },
        b: "na"
    }
})

export type IsAnyOrUnknown<T> = (any extends T ? true : false) extends true
    ? true
    : false

export type IsAny<T> = (any extends T ? AnyIsAny<T> : false) extends true
    ? true
    : false

export type IsUnknown<T> = (
    any extends T ? AnyIsUnknown<T> : false
) extends true
    ? true
    : false

type AnyIsAny<T> = (T extends {} ? true : false) extends false ? false : true

type AnyIsUnknown<T> = (T extends {} ? true : false) extends false
    ? true
    : false
