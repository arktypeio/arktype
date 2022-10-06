import type { Base } from "../../nodes/common.js"
import { Expression } from "../../nodes/expression/expression.js"
import type {
    MissingRightOperandMessage,
    ParseError,
    parseFn,
    ParserContext
} from "../common.js"
import type { Root } from "../root.js"

// TODO: Test inferring from  meta def generic perf
export type MetaDefinition = [unknown, Expression.Token, ...unknown[]]

export const isMetaDefinition = (def: unknown[]): def is MetaDefinition =>
    (def[1] as any) in Expression.tokens

export const parseMetaDefinition: parseFn<MetaDefinition> = (
    [definition, token, ...args],
    context
) => ({} as Base.Node)

export type ParseMetaDefinition<
    Def extends MetaDefinition,
    Ctx extends ParserContext
> = Def[1] extends Expression.BinaryToken
    ? Def[2] extends undefined
        ? [
              Root.parse<Def[0], Ctx>,
              ParseError<MissingRightOperandMessage<Def[1]>>
          ]
        : [Root.parse<Def[0], Ctx>, Def[1], Root.parse<Def[2], Ctx>]
    : [Root.parse<Def[0], Ctx>, Def[1]]
