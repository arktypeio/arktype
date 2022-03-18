import { createParser, typeDefProxy } from "./internal.js"
import { Fragment } from "../fragment.js"
import { Keyword } from "./keyword/keyword.js"
import { Literal } from "./literal/literal.js"
import { Alias } from "./alias.js"

export namespace Reference {
    export type Definition<Space> =
        | Keyword.Definition
        | Literal.Definition
        | Alias.Definition<Space>

    export const type = typeDefProxy as string

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        children: () => [Keyword.delegate, Literal.delegate, Alias.delegate]
    })

    export const delegate = parse as any as string
}
