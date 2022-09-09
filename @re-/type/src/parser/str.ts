import { Base } from "../nodes/base.js"
import { Branch } from "../nodes/types/nonTerminal/expression/branch/branch.js"
import { Intersection } from "../nodes/types/nonTerminal/expression/branch/intersection.js"
import { Union } from "../nodes/types/nonTerminal/expression/branch/union.js"
import { List } from "../nodes/types/nonTerminal/expression/unary/list.js"
import { Optional } from "../nodes/types/nonTerminal/expression/unary/optional.js"
import { Unary } from "../nodes/types/nonTerminal/expression/unary/unary.js"
import { fullParse } from "./full.js"
import { tryNaiveParse, TryNaiveParse } from "./naive.js"
import { InferTerminal } from "./operand/operand.js"

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
        : T extends Optional<infer Child>
        ? TreeInfer<Child, Ctx> | undefined
        : T extends List<infer Child>
        ? TreeInfer<Child, Ctx>[]
        : T extends Union<infer Left, infer Right>
        ? TreeInfer<Left, Ctx> | TreeInfer<Right, Ctx>
        : T extends Intersection<infer Left, infer Right>
        ? TreeInfer<Left, Ctx> & TreeInfer<Right, Ctx>
        : T extends Bounds.Apply<infer Child>
        ? TreeInfer<Child, Ctx>
        : unknown

    export type References<Def extends string, Dict> = TreeReferences<
        Parse<Def, Dict>
    >

    type TreeReferences<T> = T extends Unary<infer Child>
        ? TreeReferences<Child>
        : T extends Branch<infer Left, infer Right>
        ? [...TreeReferences<Left>, ...TreeReferences<Right>]
        : T extends Bounds.Apply<infer Child>
        ? TreeReferences<Child>
        : [T]

    export const parse: Base.parseFn<string> = (def, ctx) =>
        tryNaiveParse(def, ctx) ?? fullParse(def, ctx)
}
