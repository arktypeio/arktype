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
                  : `Invalid property '${Extract<
                        K,
                        string | number
                    >}'. Valid properties are: ${StringifyKeys<ExpectedType>}`
          }
    : ExpectedType

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
        : `Invalid property '${K &
              (string | number)}'. Valid properties are: ${StringifyKeys<Base>}`
} &
    { [K in MissingKeys]: K extends keyof Base ? Base[K] : never }
