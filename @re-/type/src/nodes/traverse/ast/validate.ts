import type { ParseError } from "../../../parser/common.js"
import { type } from "../../../type.js"
import type { Branching } from "../../expression/branching/branching.js"
import type { Expression } from "../../expression/expression.js"
import type { Bound } from "../../expression/infix/bound.js"
import type { Postfix } from "../../expression/postfix/postfix.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { inferAst } from "./infer.js"
import type { toString } from "./toString.js"

export type validate<def, ast, resolutions> = def extends []
    ? def
    : def extends string
    ? ast extends ParseError<infer Message>
        ? Message
        : checkAst<def, ast, resolutions>
    : // @ts-expect-error We know K will also be in AST here because it must be structural
      { [K in keyof def]: validate<def[K], ast[K], resolutions> }

// TODO: Fix union and intersection getting merged
const f = type({ a: "string|3<boolean<5[][][][]|number" }).ast

type checkAst<def, ast, resolutions> = ast extends string
    ? def
    : ast extends Bound.RightAst
    ? // TODO: Is any?
      inferAst<ast, resolutions> extends string | number | readonly unknown[]
        ? def
        : ParseError<buildUnconstrainableMessage<toString<ast[0]>, ast[1]>>
    : ast extends [infer next, Postfix.Token]
    ? checkAst<def, next, resolutions>
    : ast extends BranchingAst<infer left, infer right>
    ? checkBranching<def, checkAst<def, left, resolutions>, right, resolutions>
    : ast extends LeftAst<infer Child>
    ? checkAst<def, Child, resolutions>
    : def

type LeftAst<Child> = [PrimitiveLiteral.Number, Bound.Token, Child]

type BranchingAst<Left, Right> = [Left, Branching.Token, Right]

type checkBranching<def, leftResult, rightAst, resolutions> =
    leftResult extends ParseError<string>
        ? leftResult
        : checkAst<def, rightAst, resolutions>

export const buildUnconstrainableMessage = <
    root extends string,
    token extends Expression.ConstraintToken
>(
    root: root,
    token: token
): buildUnconstrainableMessage<root, token> =>
    `Expression '${root}' must be a non-literal number, string or array to be constrained by operator '${token}'.`

type buildUnconstrainableMessage<
    root extends string,
    token extends Expression.ConstraintToken
> = `Expression '${root}' must be a non-literal number, string or array to be constrained by operator '${token}'.`
