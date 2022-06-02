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
    Str.Validate<Left, Dict, Root>,
    Str.Validate<Right, Dict, Root>
>
