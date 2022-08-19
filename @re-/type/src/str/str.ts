import { Base } from "../base/index.js"
import { Core, ErrorToken, Naive, Tree } from "./base/index.js"

export namespace Str {
    export type Parse<Def extends string, Dict> = Naive.TryParse<Def, Dict>

    export type Validate<Def extends string, Dict> = Parse<
        Def,
        Dict
    > extends ErrorToken<infer Message>
        ? Message
        : Def

    export type Infer<
        Def extends string,
        Ctx extends Base.Parse.InferenceContext
    > = Tree.Infer<Parse<Def, Ctx["dict"]>, Ctx>

    export type References<Def extends string, Dict> = Tree.LeavesOf<
        Parse<Def, Dict>
    >

    export const parse: Base.Parse.Fn<string> = (def, ctx) =>
        Naive.tryParse(def, ctx) ?? Core.parse(def, ctx)
}
