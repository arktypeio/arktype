import { Base } from "./base/index.js"
import { Naive, ParseError, Parser, ParseTree } from "./parser/index.js"

export namespace Str {
    export type Parse<Def extends string, Dict> = Naive.TryParse<Def, Dict>

    export type Validate<Def extends string, Dict> = Parse<
        Def,
        Dict
    > extends ParseError<infer Message>
        ? Message
        : Def

    export type Infer<
        Def extends string,
        Ctx extends Base.Parsing.InferenceContext
    > = ParseTree.Infer<Parse<Def, Ctx["dict"]>, Ctx>

    export type References<Def extends string, Dict> = ParseTree.LeavesOf<
        Parse<Def, Dict>
    >

    export const parse: Base.Parsing.ParseFn<string> = (def, ctx) =>
        Naive.tryParse(def, ctx) ?? fullParse(def, ctx)

    const fullParse = (def: string, ctx: Base.Parsing.Context) => {
        const parser = new Parser(def, ctx)
        parser.shiftBranches()
        return parser.expression!
    }
}
