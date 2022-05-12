import {
    IsAnyOrUnknown,
    NonObject,
    Recursible,
    Stringifiable
} from "./common.ts"
import { StringifyPossibleTypes } from "./stringUtils.ts"

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

export type InvalidPropertyError<O, Property> = `Invalid property '${Property &
    Stringifiable}'. Valid properties are: ${StringifyPossibleTypes<
    keyof O & Stringifiable
>}`
