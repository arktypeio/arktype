import { createParser, typeDefProxy } from "./internal.js"
import { Fragment } from "../fragment.js"
import { Keyword } from "./keyword/keyword.js"
import { Literal } from "./literal.js"

export namespace Builtin {
    export type Definition = Keyword.Definition | Literal.Definition

    export type Parse<Def extends string> = Def extends Keyword.Definition
        ? Keyword.Parse<Def>
        : Def extends Literal.Definition
        ? Literal.Parse<Def>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        children: () => [Keyword.delegate, Literal.delegate]
    })

    export const delegate = parse as any as Definition
}
