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

// Notes:
// Bails out as soon as it detects Compare is not assignable to Base as opposed to only comparing recursibles
// Can't detect missing keys at top level
// Used in statelessly to preserve exact types, as for some reason normal Exact breaks them
export type ExactObject<Compare, Base, C = Compare, B = Recursible<Base>> = {
    [K in keyof C]: K extends keyof B
        ? IsAnyOrUnknown<C[K]> extends true
            ? B[K]
            : C[K] extends B[K]
            ? C[K] extends NonRecursible
                ? C[K]
                : ExactObject<C[K], B[K]>
            : B[K]
        : InvalidPropertyError<Base, K>
}

export type InvalidPropertyError<O, Property> = `Invalid property '${Extract<
    Property,
    string | number
>}'. Valid properties are: ${StringifyKeys<O>}`
