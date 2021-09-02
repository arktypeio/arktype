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

type Recursible<T> = T extends NonRecursible ? never : T

type NarrowRecurse<T> =
    | (T extends [] ? [] : never)
    | (T extends NonRecursible ? T : never)
    | {
          [K in keyof T]:
              | (IsAnyOrUnknown<T[K]> extends true ? T[K] : never)
              | NarrowRecurse<T[K]>
      }

export type Narrow<T> = Cast<T, NarrowRecurse<T>>

const narrow = <T>(t: Narrow<T>): T => [] as any

const result = narrow({
    a: {
        b: {
            c: {} as unknown,
            d: (a: { a: 5; b: ["a", true] }) => ({
                a: 5,
                b: true
            }),
            e: 5,
            h: ["z", true]
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
    keyof O & StringifiableType
>

export type StringifiableType =
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined

// type ExactFunction<F, ExpectedType> = ExpectedType extends (
//     ...args: infer ExpectedArgs
// ) => infer ExpectedReturn
//     ? F extends (...args: infer Args) => infer Return
//         ? (...args: Exact<Args, ExpectedArgs>) => Exact<Return, ExpectedReturn>
//         : (...args: ExpectedArgs) => ExpectedReturn
//     : ExpectedType

// type ExactFunction<T, ExpectedType> = ExtractFunction<T> extends (
//     ...args: infer Args
// ) => infer Return
//     ? ExtractFunction<ExpectedType> extends (
//           ...args: infer ExpectedArgs
//       ) => infer ExpectedReturn
//         ? (
//               ...args: Exact<Args, ExpectedArgs> & any[]
//           ) => Exact<Return, ExpectedReturn>
//         : never
//     : never

// export type Exact<T, ExpectedType> = ExpectedType extends unknown
//     ? T extends ExpectedType
//         ? T extends NonRecursible
//             ? T
//             :
//                   | ExactFunction<T, ExpectedType>
//                   | {
//                         [K in keyof T]: K extends keyof ExpectedType
//                             ? Exact<T[K], ExpectedType[K]>
//                             : TypeError<`Invalid property '${K &
//                                   (
//                                       | string
//                                       | number
//                                   )}'. Valid properties are: ${StringifyKeys<ExpectedType>}`>
//                     }
//         : ExpectedType
//     : ``

type ExtractFunction<T> = Extract<T, SimpleFunction>

type ExactFunction<T, ExpectedType> = ExtractFunction<T> extends (
    ...args: infer Args
) => infer Return
    ? ExtractFunction<ExpectedType> extends (
          ...args: infer ExpectedArgs
      ) => infer ExpectedReturn
        ? (...args: Exact<Args, ExpectedArgs>) => Exact<Return, ExpectedReturn>
        : ExpectedType
    : ExpectedType

type InferFunction<F> = ExtractFunction<F> extends (
    ...args: infer Args
) => infer Return
    ? [Args, Return]
    : never

export type Exact<T, ExpectedType> = T extends NonObject
    ? T extends ExpectedType
        ? T
        : ExpectedType
    : {
          [K in keyof T]: K extends keyof ExpectedType
              ? T[K] extends SimpleFunction
                  ? ExactFunction<T[K], ExpectedType[K]>
                  : Exact<T[K], ExpectedType[K]>
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
