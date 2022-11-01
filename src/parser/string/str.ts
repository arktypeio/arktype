import type {
    DynamicParserContext,
    ParseError,
    StaticParserContext
} from "../common.js"
import { fullParse } from "./full.js"
import { tryNaiveParse } from "./naive.js"

export namespace Str {
    export type parse<
        def extends string,
        context extends StaticParserContext
    > = tryNaiveParse<def, context>

    export type validate<
        def extends string,
        context extends StaticParserContext
    > = parse<def, context> extends ParseError<infer Message> ? Message : def

    export const parse = (def: string, context: DynamicParserContext) =>
        tryNaiveParse(def, context) ?? fullParse(def, context)
}
