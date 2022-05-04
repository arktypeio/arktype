import { createParser, typeDefProxy, Precedence, Defer } from "./internal.js"
import { Str } from "../str.js"
import { Keyword } from "./keyword/keyword.js"
import { EmbeddedLiteral } from "./embeddedLiteral/embeddedLiteral.js"
import { Alias } from "./alias.js"
import { ShallowNode } from "../internal.js"

export namespace Reference {
    export const type = typeDefProxy as string

    export const parser = createParser(
        {
            type,
            parent: () => Str.parser,
            children: () => [
                Keyword.delegate,
                EmbeddedLiteral.delegate,
                Alias.delegate
            ]
        },
        { references: ({ def }) => [def] }
    )

    export const delegate = parser as any as string
}
