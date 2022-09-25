import type { Base } from "../../nodes/base.js"
import type { BranchAst } from "../../nodes/branches/branch.js"
import type { IntersectionAst } from "../../nodes/branches/intersection.js"
import type { UnionAst } from "../../nodes/branches/union.js"
import type { ConstrainedAst } from "../../nodes/constraints/constraint.js"
import type { InferTerminal } from "../../nodes/terminals/terminal.js"
import type { ArrayAst } from "../../nodes/unaries/array.js"
import type { OptionalAst } from "../../nodes/unaries/optional.js"
import type { UnaryAst } from "../../nodes/unaries/unary.js"
import type { Space } from "../../space.js"
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

    export type References<Def extends string, Dict> = []

    // type TreeReferences<T> = T extends UnaryAst<infer Child>
    //     ? TreeReferences<Child>
    //     : T extends BranchAst<infer Left, infer Right>
    //     ? [...TreeReferences<Left>, ...TreeReferences<Right>]
    //     : T extends ConstrainedAst<infer Child>
    //     ? TreeReferences<Child>
    //     : [T]

    export const parse: parseFn<string> = (def, context) =>
        tryNaiveParse(def, context) ?? fullParse(def, context)
}
