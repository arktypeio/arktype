import type { Space } from "../../space/parse.js"
import type { ParseError, parseFn } from "../common.js"
import type { FullParse } from "./full.js"
import { fullParse } from "./full.js"
import type { TryNaiveParse } from "./naive.js"
import { tryNaiveParse } from "./naive.js"

export namespace Str {
    export type Parse<
        Def extends string,
        S extends Space.Definition
    > = {} extends S["Meta"] ? TryNaiveParse<Def, S> : FullParse<Def, S>

    export type Validate<
        Def extends string,
        S extends Space.Definition
    > = Parse<Def, S> extends ParseError<infer Message> ? Message : Def

    export const parse: parseFn<string> = (def, context) =>
        tryNaiveParse(def, context) ?? fullParse(def, context)
}
