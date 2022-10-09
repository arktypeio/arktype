import type { IsAny } from "@re-/tools"
import type { ParseError } from "../../../parser/common.js"
import { type } from "../../../type.js"
import type { Constrainable } from "../../common.js"
import type { Branching } from "../../expression/branching/branching.js"
import type { Infix } from "../../expression/infix/infix.js"
import type { PrimitiveLiteral } from "../../terminal/primitiveLiteral.js"
import type { inferAst } from "./infer.js"
import type { toString } from "./toString.js"

export type validate<def, ast, resolutions> = def extends []
    ? def
    : def extends string
    ? ast extends ParseError<infer Message>
        ? Message
        : catchErrorOrFallback<checkAst<ast, resolutions>, def>
    : // @ts-expect-error We know K will also be in AST here because it must be structural
      { [K in keyof def]: validate<def[K], ast[K], resolutions> }

type catchErrorOrFallback<errors extends string[], def> = [] extends errors
    ? def
    : errors[0]

type checkAst<ast, resolutions> = ast extends string
    ? []
    : ast extends [infer child, unknown]
    ? checkAst<child, resolutions>
    : ast extends [infer left, infer token, infer right]
    ? token extends Branching.Token
        ? [...checkAst<left, resolutions>, ...checkAst<right, resolutions>]
        : token extends Infix.ConstraintToken
        ? left extends PrimitiveLiteral.Number
            ? checkAst<right, resolutions>
            : isAssignableTo<
                  inferAst<left, resolutions>,
                  Constrainable.Data
              > extends true
            ? checkAst<left, resolutions>
            : [ParseError<buildUnconstrainableMessage<toString<ast[0]>, token>>]
        : checkAst<left, resolutions>
    : []

type isAssignableTo<inferred, t> = IsAny<inferred> extends true
    ? true
    : inferred extends t
    ? true
    : false

export const buildUnconstrainableMessage = <
    root extends string,
    token extends Infix.ConstraintToken
>(
    root: root,
    token: token
): buildUnconstrainableMessage<root, token> =>
    `Expression '${root}' must be a number, string or array to be constrained by operator '${token}'.`

type buildUnconstrainableMessage<
    root extends string,
    token extends Infix.ConstraintToken
> = `Expression '${root}' must be a number, string or array to be constrained by operator '${token}'.`
