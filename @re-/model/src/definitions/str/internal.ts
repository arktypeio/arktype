export * from "../internal.js"

import { ParseErrorMessage } from "../internal.js"
import { Str } from "./index.js"

type BinaryValidationResult<Left, Right> = Left extends ParseErrorMessage
    ? Left
    : Right extends ParseErrorMessage
    ? Right
    : Left

export type BinaryValidate<
    Left extends string,
    Right extends string,
    Dict,
    Root
> = BinaryValidationResult<
    Str.FastValidate<Left, Dict, Root>,
    Str.FastValidate<Right, Dict, Root>
>
