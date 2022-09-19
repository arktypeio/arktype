import type { Base } from "../../nodes/base.js"
import type { Constrained } from "../../nodes/constraints/common.js"
import type { Branch } from "../../nodes/nonTerminal/expression/branch/branch.js"
import type { Intersection } from "../../nodes/nonTerminal/expression/branch/intersection.js"
import type { Union } from "../../nodes/nonTerminal/expression/branch/union.js"
import type { List } from "../../nodes/nonTerminal/expression/unary/list.js"
import type { Optional } from "../../nodes/nonTerminal/expression/unary/optional.js"
import type { Unary } from "../../nodes/nonTerminal/expression/unary/unary.js"
import type { ParseError, parseFn } from "../common.js"
import { fullParse } from "./full.js"
import type { TryNaiveParse } from "./naive.js"
import { tryNaiveParse } from "./naive.js"
import type { InferTerminal } from "./operand/operand.js"

export namespace Str {
    export type Parse<Def extends string, Dict> = TryNaiveParse<Def, Dict>

    export type Validate<Def extends string, Dict> = Parse<
        Def,
        Dict
    > extends ParseError<infer Message>
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
        : T extends Constrained<infer Child>
        ? TreeInfer<Child, Ctx>
        : unknown

    export type References<Def extends string, Dict> = TreeReferences<
        Parse<Def, Dict>
    >

    type TreeReferences<T> = T extends Unary<infer Child>
        ? TreeReferences<Child>
        : T extends Branch<infer Left, infer Right>
        ? [...TreeReferences<Left>, ...TreeReferences<Right>]
        : T extends Constrained<infer Child>
        ? TreeReferences<Child>
        : [T]

    export const parse: parseFn<string> = (def, ctx) =>
        tryNaiveParse(def, ctx) ?? fullParse(def, ctx)
}
