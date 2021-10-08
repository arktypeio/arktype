import {
    ExtractFunction,
    IsAnyOrUnknown,
    Key,
    NonObject,
    NonRecursible,
    Recursible,
    RequiredKeys,
    StringifyKeys
} from "./common.js"

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
                  : InvalidPropertyError<ExpectedType, K>
          }
    : ExpectedType

export type ExactProperties<
    Compare,
    Base,
    C = Compare,
    B = Recursible<Base>
> = {
    [K in keyof C]: K extends keyof B
        ? IsAnyOrUnknown<C[K]> extends true
            ? B[K]
            : C[K] extends B[K]
            ? C[K] extends NonRecursible
                ? C[K]
                : ExactProperties<C[K], B[K]>
            : B[K]
        : InvalidPropertyError<Base, K>
}

export type InvalidPropertyError<O, Property> = `Invalid property '${Extract<
    Property,
    string | number
>}'. Valid properties are: ${StringifyKeys<O>}`

export type ExactObject<
    Compare,
    Base,
    MissingKeys extends Key = Exclude<RequiredKeys<Base>, keyof Compare>
> = {
    [K in keyof Compare]: K extends keyof Base
        ? IsAnyOrUnknown<Compare[K]> extends true
            ? Base[K]
            : IsAnyOrUnknown<Base[K]> extends true
            ? Compare[K]
            : Compare[K] extends NonRecursible
            ? Base[K] extends NonRecursible
                ? Compare[K] extends Base[K]
                    ? Compare[K]
                    : Base[K]
                : Base[K]
            : ExactObject<Recursible<Compare[K]>, Recursible<Base[K]>>
        : InvalidPropertyError<Base, K>
} &
    { [K in MissingKeys]: K extends keyof Base ? Base[K] : never }
