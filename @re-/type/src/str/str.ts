import { Node } from "../common.js"
import { Main, Naive, Tokens, Tree } from "./parser/index.js"

export namespace Str {
    export type Parse<Def extends string, Dict> = Naive.TryParse<Def, Dict>

    export type Validate<Def extends string, Dict> = Parse<
        Def,
        Dict
    > extends Tokens.ErrorToken<infer Message>
        ? Message
        : Def

    export type Infer<T, Ctx extends Node.InferenceContext> = Tree.Infer<T, Ctx>

    export type References<T> = Tree.LeavesOf<T>

    export const parse: Node.ParseFn<string> = (def, ctx) =>
        Naive.tryParse(def, ctx) ?? Main.parse(def, ctx)
}
