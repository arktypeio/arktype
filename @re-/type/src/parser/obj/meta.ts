import type { Base } from "../../nodes/base.js"
import { Expression } from "../../nodes/expression/expression.js"
import type { ParseError, parseFn, ParserContext } from "../common.js"
import type { Root } from "../root.js"
import type { Operand } from "../str/operand/operand.js"

// TODO: Test inferring from  meta def generic perf
export type MetaDefinition = [unknown, Expression.Token, ...unknown[]]

export const isMetaDefinition = (def: unknown[]): def is MetaDefinition =>
    (def[1] as any) in Expression.tokensToKinds

export const parseMetaDefinition: parseFn<MetaDefinition> = (
    [definition, token, ...args],
    context
) => ({} as Base.UnknownNode)

export type ParseMetaDefinition<
    Def extends MetaDefinition,
    Ctx extends ParserContext
> = Def[1] extends Expression.BinaryToken
    ? Def[2] extends undefined
        ? [
              Root.parse<Def[0], Ctx>,
              ParseError<Operand.buildMissingRightOperandMessage<Def[1], "">>
          ]
        : [Root.parse<Def[0], Ctx>, Def[1], Root.parse<Def[2], Ctx>]
    : [Root.parse<Def[0], Ctx>, Def[1]]
