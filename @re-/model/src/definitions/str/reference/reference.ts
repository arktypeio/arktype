import { Str } from "../str.js"
import { Alias } from "./alias.js"
import { EmbeddedLiteral } from "./embeddedLiteral/embeddedLiteral.js"
import { createParser, typeDefProxy } from "./internal.js"
import { Keyword } from "./keyword/keyword.js"

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
