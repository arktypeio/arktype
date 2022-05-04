import { StringLiteral as StringLiteral } from "./stringLiteral.js"
import { EmbeddedNumberLiteral as EmbeddedNumberLiteral } from "./embeddedNumberLiteral.js"
import { EmbeddedBigintLiteral as EmbeddedBigintLiteral } from "./embeddedBigintLiteral.js"
import { Reference } from "../reference.js"
import { EmbeddedRegexLiteral as EmbeddedRegexLiteral } from "./embeddedRegexLiteral.js"
import {
    FirstEnclosed,
    createParser,
    typeDefProxy,
    Precedence
} from "./internal.js"

export namespace EmbeddedLiteral {
    export const type = typeDefProxy as string

    export const parser = createParser({
        type,
        parent: () => Reference.parser,
        children: () => [
            StringLiteral.delegate,
            EmbeddedRegexLiteral.delegate,
            EmbeddedNumberLiteral.delegate,
            EmbeddedBigintLiteral.delegate
        ]
    })

    export const delegate = parser as any as string
}
