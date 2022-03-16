import { createParser, typeDefProxy } from "./internal.js"
import { Fragment } from "../fragment.js"
import { Keyword } from "./keyword/keyword.js"
import { Literal } from "./literal.js"
import { Regex } from "./regex.js"

export namespace Builtin {
    export type Definition =
        | Keyword.Definition
        | Literal.Definition
        | Regex.Definition

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        children: () => [Keyword.delegate, Literal.delegate, Regex.delegate]
    })

    export const delegate = parse as any as Definition
}
