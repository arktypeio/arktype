import type { ParseError, parseFn, ParserContext } from "../common.js"
import { fullParse } from "./full.js"
import type { TryNaiveParse } from "./naive.js"
import { tryNaiveParse } from "./naive.js"

export namespace Str {
    export type Parse<
        Def extends string,
        Ctx extends ParserContext
    > = TryNaiveParse<Def, Ctx>

    export type Validate<Def extends string, Ctx extends ParserContext> = Parse<
        Def,
        Ctx
    > extends ParseError<infer Message>
        ? Message
        : Def

    export const parse: parseFn<string> = (def, ctx) =>
        tryNaiveParse(def, ctx) ?? fullParse(def, ctx)
}
