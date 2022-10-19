import type { Base } from "../../nodes/base/base.js"
import type { Tokens } from "../../nodes/expression/tokens.js"

import type { ParseError, parseFn, ParserContext } from "../common.js"
import type { Root } from "../root.js"
import type { Operand } from "../str/operand/operand.js"

export type MetaDefinition = [unknown, Tokens.Base, ...unknown[]]

export const isMetaDefinition = (def: unknown[]): def is MetaDefinition =>
    (def[1] as any) in {}

export const parseMetaDefinition: parseFn<MetaDefinition> = (
    [definition, token, ...args],
    context
) => ({} as Base.Node)

export type ParseMetaDefinition<
    Def extends MetaDefinition,
    Ctx extends ParserContext
> = Def[1] extends Tokens.Binary
    ? Def[2] extends undefined
        ? [
              Root.parse<Def[0], Ctx>,
              ParseError<Operand.buildMissingRightOperandMessage<Def[1], "">>
          ]
        : [Root.parse<Def[0], Ctx>, Def[1], Root.parse<Def[2], Ctx>]
    : [Root.parse<Def[0], Ctx>, Def[1]]
