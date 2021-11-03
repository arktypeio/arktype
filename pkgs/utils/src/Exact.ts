import {
    ExtractFunction,
    IsAnyOrUnknown,
    Key,
    NonObject,
    NonRecursible,
    Recursible,
    RequiredKeys,
    Stringifiable,
    StringifyPossibleTypes
} from "./common.js"

export type ExactFunction<Compare, Base> = Compare extends Base
    ? ExtractFunction<Compare> extends (...args: infer Args) => infer Return
        ? ExtractFunction<Base> extends (
              ...args: infer ExpectedArgs
          ) => infer ExpectedReturn
            ? (
                  ...args: Exact<Args, ExpectedArgs>
              ) => Exact<Return, ExpectedReturn>
            : Base
        : Base
    : Base

export type Exact<Compare, Base> = IsAnyOrUnknown<Compare> extends true
    ? Base
    : Compare extends Base
    ? Compare extends NonObject
        ? Compare
        : {
              [K in keyof Compare]: K extends keyof Recursible<Base>
                  ? Exact<Compare[K], Recursible<Base>[K]>
                  : InvalidPropertyError<Base, K>
          }
    : Base

export type ExactObject<
    Compare,
    Base,
    C = Recursible<Compare>,
    B = Recursible<Base>,
    MissingKeys extends Key = Exclude<RequiredKeys<B>, keyof C>
> = {
    [K in keyof C]: K extends keyof B
        ? IsAnyOrUnknown<C[K]> extends true
            ? B[K]
            : IsAnyOrUnknown<B[K]> extends true
            ? C[K]
            : C[K] extends NonRecursible
            ? B[K] extends NonRecursible
                ? C[K] extends B[K]
                    ? C[K]
                    : B[K]
                : B[K]
            : ExactObject<Recursible<C[K]>, B[K]>
        : InvalidPropertyError<B, K>
} &
    { [K in MissingKeys]: K extends keyof B ? B[K] : never }

export type InvalidPropertyError<O, Property> = `Invalid property '${Property &
    Stringifiable}'. Valid properties are: ${StringifyPossibleTypes<
    keyof O & Stringifiable
>}`
