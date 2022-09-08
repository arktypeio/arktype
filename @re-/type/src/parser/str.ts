import { Base } from "../nodes/base.js"
import { fullParse } from "./full.js"
import { tryNaiveParse, TryNaiveParse } from "./naive.js"
import { InferTerminal } from "./operand/index.js"
import { Operator } from "./operator/index.js"

export namespace Str {
    export type Parse<Def extends string, Dict> = TryNaiveParse<Def, Dict>

    export type Validate<Def extends string, Dict> = Parse<
        Def,
        Dict
    > extends Base.ParseError<infer Message>
        ? Message
        : Def

    export type Infer<
        Def extends string,
        Ctx extends Base.InferenceContext
    > = TreeInfer<Parse<Def, Ctx["Dict"]>, Ctx>

    type TreeInfer<T, Ctx extends Base.InferenceContext> = T extends string
        ? InferTerminal<T, Ctx>
        : T extends Operator.Optional<infer Child>
        ? TreeInfer<Child, Ctx> | undefined
        : T extends Operator.List<infer Child>
        ? TreeInfer<Child, Ctx>[]
        : T extends Operator.Union<infer Left, infer Right>
        ? TreeInfer<Left, Ctx> | TreeInfer<Right, Ctx>
        : T extends Operator.Intersection<infer Left, infer Right>
        ? TreeInfer<Left, Ctx> & TreeInfer<Right, Ctx>
        : T extends Operator.Bound.Bound<infer Child>
        ? TreeInfer<Child, Ctx>
        : unknown

    export type References<Def extends string, Dict> = TreeReferences<
        Parse<Def, Dict>
    >

    type TreeReferences<T> = T extends Operator.Unary<infer Child>
        ? TreeReferences<Child>
        : T extends Operator.Branch<infer Left, infer Right>
        ? [...TreeReferences<Left>, ...TreeReferences<Right>]
        : T extends Operator.Bound.Bound<infer Child>
        ? TreeReferences<Child>
        : [T]

    export const parse: Base.parseFn<string> = (def, ctx) =>
        tryNaiveParse(def, ctx) ?? fullParse(def, ctx)
}
