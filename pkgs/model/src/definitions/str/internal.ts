export * from "../internal.js"

import { ParseError } from "../internal.js"
import { Str } from "./index.js"

type BinaryValidationResult<Left, Right, Root> = Left extends ParseError
    ? Left
    : Right extends ParseError
    ? Right
    : Root

export type BinaryValidate<
    Left extends string,
    Right extends string,
    Dict,
    Root
> = BinaryValidationResult<
    Str.FastValidate<Left, Dict, Root>,
    Str.FastValidate<Right, Dict, Root>,
    Root
>
