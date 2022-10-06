import type { IsAny } from "@re-/tools"
import type { ParseError } from "../../../parser/common.js"
import type { Constrainable } from "../../common.js"
import type { Branching } from "../../expression/branching/branching.js"
import type { Expression } from "../../expression/expression.js"
import type { inferAst } from "./infer.js"
import type { toString } from "./toString.js"

export namespace Validate {
    export type syntactic<def, ast> = def extends []
        ? def
        : ast extends ParseError<infer Message>
        ? Message
        : // @ts-expect-error We know K will also be in AST here because it must be structural
          { [K in keyof def]: syntactic<def[K], ast[K]> }

    export type semantic<def, ast, resolutions> = ast extends string
        ? def
        : ast extends expressionAst
        ? expression<def, ast, resolutions>
        : // @ts-expect-error We know K will also be in AST here because it must be structural
          { [K in keyof def]: semantic<def[K], ast[K], resolutions> }

    type expressionAst = [unknown, Expression.Token, ...unknown[]]

    type expression<
        def,
        ast extends expressionAst,
        resolutions
    > = ast[1] extends Expression.ConstraintToken
        ? constrained<inferAst<ast, resolutions>, def, ast>
        : ast[1] extends Branching.Token
        ? branching<semantic<def, ast[2], resolutions>, def, ast, resolutions>
        : semantic<def, ast[0], resolutions>

    type branching<
        leftResult,
        def,
        ast extends expressionAst,
        resolutions
    > = leftResult extends def ? semantic<def, ast[2], resolutions> : leftResult

    type constrained<inferred, def, node> = IsAny<inferred> extends true
        ? def
        : number extends inferred
        ? def
        : string extends inferred
        ? def
        : inferred extends readonly unknown[]
        ? def
        : // TODO: Figure out where we're converting to string
          buildUnconstrainableMessage<toString<node>>

    export const buildUnconstrainableMessage = <root extends string>(
        root: root
    ): buildUnconstrainableMessage<root> =>
        `Bounded expression '${root}' must be a number, string or array.`

    type buildUnconstrainableMessage<root extends string> =
        `Bounded expression '${root}' must be a number, string or array.`
}
