import type { Base } from "../../nodes/base/base.js"
import type { Branching } from "../../nodes/branching/branching.js"
import type { Bound } from "../../nodes/unary/bound.js"
import type { Unary } from "../../nodes/unary/unary.js"
import type { ParseError, parseFn, ParserContext } from "../common.js"
import type { Root } from "../root.js"
import type { Operand } from "../str/operand/operand.js"

// TODO: Centralize
type Token = Unary.Token | Branching.Token
type InfixToken = Bound.Token | Branching.Token | "%"

// TODO: Test inferring from  meta def generic perf
export type MetaDefinition = [unknown, Token, ...unknown[]]

export const isMetaDefinition = (def: unknown[]): def is MetaDefinition =>
    (def[1] as any) in {}

export const parseMetaDefinition: parseFn<MetaDefinition> = (
    [definition, token, ...args],
    context
) => ({} as Base.Node)

export type ParseMetaDefinition<
    Def extends MetaDefinition,
    Ctx extends ParserContext
> = Def[1] extends InfixToken
    ? Def[2] extends undefined
        ? [
              Root.parse<Def[0], Ctx>,
              ParseError<Operand.buildMissingRightOperandMessage<Def[1], "">>
          ]
        : [Root.parse<Def[0], Ctx>, Def[1], Root.parse<Def[2], Ctx>]
    : [Root.parse<Def[0], Ctx>, Def[1]]
