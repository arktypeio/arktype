import { Node } from "./common.js"
import * as Main from "./main.js"
import * as Naive from "./naive.js"
import { InferTerminal } from "./operand/index.js"
import { Operator } from "./operator/index.js"

export namespace Str {
    export type Parse<Def extends string, Dict> = Naive.TryParse<Def, Dict>

    export type Validate<Def extends string, Dict> = Parse<
        Def,
        Dict
    > extends Node.ParseError<infer Message>
        ? Message
        : Def

    export type Infer<
        Def extends string,
        Ctx extends Node.InferenceContext
    > = TreeInfer<Parse<Def, Ctx["Dict"]>, Ctx>

    type TreeInfer<T, Ctx extends Node.InferenceContext> = T extends string
        ? InferTerminal<T, Ctx>
        : T extends Operator.Optional<infer Child>
        ? TreeInfer<Child, Ctx> | undefined
        : T extends Operator.List<infer Child>
        ? TreeInfer<Child, Ctx>[]
        : T extends Operator.Union<infer Left, infer Right>
        ? TreeInfer<Left, Ctx> | TreeInfer<Right, Ctx>
        : T extends Operator.Intersection<infer Left, infer Right>
        ? TreeInfer<Left, Ctx> & TreeInfer<Right, Ctx>
        : // @ts-expect-error Must be a bound node, so we just infer from the first element.
          TreeInfer<T[0], Ctx>

    export type References<Def extends string, Dict> = TreeReferences<
        Parse<Def, Dict>
    >

    type TreeReferences<T> = T extends Operator.Unary<infer Child>
        ? TreeReferences<Child>
        : T extends Operator.Branch<infer Left, infer Right>
        ? [...TreeReferences<Left>, ...TreeReferences<Right>]
        : [T]

    export const parse: Node.parseFn<string> = (def, ctx) =>
        Naive.tryParse(def, ctx) ?? Main.parse(def, ctx)
}
