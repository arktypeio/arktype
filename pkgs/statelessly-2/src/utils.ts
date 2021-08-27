import {
    Object as ToolbeltObject,
    Union as ToolbeltUnion,
    List as ToolbeltList,
    Any as ToolbeltAny,
    Function as ToolbeltFunction
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

export type SimpleFunction = (...args: any[]) => any

// type NarrowFunction<T> = T extends (...args: infer Args) => infer Return
//     ? (...args: Narrow<Args>) => Narrow<Return>
//     : never

type NarrowRecurse<T> =
    | (T extends [] ? [] : never)
    | (T extends NonRecursible ? T : never)
    | {
          [K in keyof T]:
              | (IsAnyOrUnknown<T[K]> extends true ? T[K] : never)
              | NarrowRecurse<T[K]>
      }

// type Narrowable = string | number | bigint | boolean

const narrow = <T>(t: Narrow<T>): T => [] as any

type Zfds = Narrow<{ a: any }>

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

export type Narrow<T> = Cast<T, NarrowRecurse<T>>

// const z = narrow({
//     users: {
//         defines: "user",
//         fields: {
//             x: {
//                 type: "string",
//                 onChange: (_) => "",
//                 z: {} as unknown,
//                 d: {} as any
//             }
//         }
//     },
//     groups: {
//         defines: "group",
//         fields: {
//             members: "string",
//             another: {
//                 type: "boolean",
//                 onChange: (_) => ""
//             }
//         }
//     }
// })

const f = narrow({
    z: (x: [1, "f", true, unknown, [3, "af"]]) => [true, false, ["a", 5]]
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
        : (...args: Args) => Return
    : T

export type Exact<T, ExpectedType> = ExpectedType extends unknown
    ? T extends ExpectedType
        ? T extends NonObject
            ? T
            : {
                  [K in keyof T]: K extends keyof ExpectedType
                      ? ExtractFunction<T[K]> extends never
                          ? Exact<T[K], ExpectedType[K]>
                          : ExactFunction<T[K], ExpectedType[K]>
                      : TypeError<`Invalid property '${K &
                            (
                                | string
                                | number
                            )}'. Valid properties are: ${StringifyKeys<ExpectedType>}`>
              }
        : ExpectedType
    : TypeError<`ExpectedType didn't extend unknown.`>

type ExactObject<O, Reference> = {
    [K in keyof O]: Exact<O[K], KeyValuate<Reference, K>>
}

type Ref<T> = {
    [K in keyof T]: Exact<
        T[K],
        {
            x?: { a?: (_: string) => { a: number } }
            y?: { a?: (_: string) => { a: number } }
            b: string
        }
    >
}

const exact = <T>(t: Ref<T>) => [] as any as T

type Z = Exact<() => {}, () => { a: true }>

const t = exact({
    shmope: {
        x: { a: (_) => ({ a: 5 }) },
        y: { a: (_) => ({ a: 5, b: true }) },
        b: "narrow"
    },
    brope: {
        x: { a: (_) => ({ a: 5 }) },
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
