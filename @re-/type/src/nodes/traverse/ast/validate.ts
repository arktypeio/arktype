import type { Get } from "@re-/tools"
import type { ParseError } from "../../../parser/common.js"
import { type } from "../../../type.js"
import type { Constrainable } from "../../common.js"
import type { Branching } from "../../expression/branching/branching.js"
import type { Expression } from "../../expression/expression.js"
import type { Infer } from "./infer.js"
import type { toString } from "./toString.js"

export type syntacticValidate<def, ast> = def extends []
    ? def
    : def extends string
    ? ast extends ParseError<infer Message>
        ? Message
        : def
    : // @ts-expect-error We know K will also be in AST here because it must be structural
      { [K in keyof def]: syntacticValidate<def[K], ast[K]> }

type({ a: "boolean<5" })

export type semanticValidate<def, ast, resolutions> = ast extends string
    ? def
    : ast extends [unknown, Expression.Token, ...unknown[]]
    ? ast[1] extends Expression.ConstraintToken
        ? validateConstrained<def, ast, resolutions>
        : ast[1] extends Branching.Token
        ? // TODO: Validate right
          semanticValidate<def, ast[0], resolutions>
        : semanticValidate<def, ast[0], resolutions>
    : // @ts-expect-error We know K will also be in AST here because it must be structural
      { [K in keyof def]: semanticValidate<def[K], ast[K], resolutions> }

type validateConstrained<def, node, resolutions> = Infer<
    node,
    resolutions
> extends Constrainable.Data
    ? def
    : buildUnboundableMessage<toString<node>>

export const buildUnboundableMessage = <root extends string>(
    root: root
): buildUnboundableMessage<root> =>
    `Bounded expression '${root}' must be a number-or-string-typed keyword or an array-typed expression.`

type buildUnboundableMessage<root extends string> =
    `Bounded expression '${root}' must be a number-or-string-typed keyword or an array-typed expression.`
