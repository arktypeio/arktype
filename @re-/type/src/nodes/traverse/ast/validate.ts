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
        : checkAst<def, ast, resolutions>
    : // @ts-expect-error We know K will also be in AST here because it must be structural
      { [K in keyof def]: validate<def[K], ast[K], resolutions> }

// TODO: Fix union and intersection getting merged
const f = type({ a: "string|boolean%5[][][][]|number" }).ast

type checkAst<def, ast, resolutions> = ast extends string
    ? def
    : ast extends [infer child, unknown]
    ? checkAst<def, child, resolutions>
    : ast extends [infer left, infer token, infer right]
    ? token extends Branching.Token
        ? checkBranching<
              def,
              checkAst<def, left, resolutions>,
              right,
              resolutions
          >
        : token extends Infix.ConstraintToken
        ? left extends PrimitiveLiteral.Number
            ? checkAst<def, right, resolutions>
            : isAssignableTo<
                  inferAst<left, resolutions>,
                  Constrainable.Data
              > extends true
            ? checkAst<def, left, resolutions>
            : ParseError<buildUnconstrainableMessage<toString<ast[0]>, token>>
        : checkAst<def, left, resolutions>
    : def

type checkBranching<def, leftResult, rightAst, resolutions> =
    leftResult extends ParseError<string>
        ? leftResult
        : checkAst<def, rightAst, resolutions>

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
