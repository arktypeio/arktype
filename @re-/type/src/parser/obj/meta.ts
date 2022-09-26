import type { Base } from "../../nodes/base.js"
import { type } from "../../type.js"
import type {
    BinaryToken,
    MetaToken,
    MissingRightOperandMessage,
    ParseError,
    parseFn,
    ParserContext
} from "../common.js"
import { metaTokens } from "../common.js"
import type { Root } from "../root.js"

// TODO: Compare perf of infer from generic, centralize universally on one strategy

export type MetaDefinition = [unknown, MetaToken, ...unknown[]]

export const isMetaDefinition = (def: unknown[]): def is MetaDefinition =>
    (def[1] as any) in metaTokens

export const parseMetaDefinition: parseFn<MetaDefinition> = (
    [definition, token, ...args],
    context
) => (token === ";" ? ({} as Base.node) : ({} as Base.node))

const z = type([{ a: "string" }, "&", { b: "number" }]).ast

export type ParseMetaDefinition<
    Def extends MetaDefinition,
    Ctx extends ParserContext
> = Def[1] extends BinaryToken
    ? Def[2] extends undefined
        ? [
              Root.Parse<Def[0], Ctx>,
              ParseError<MissingRightOperandMessage<Def[1]>>
          ]
        : [Root.Parse<Def[0], Ctx>, Def[1], Root.Parse<Def[2], Ctx>]
    : [Root.Parse<Def[0], Ctx>, Def[1]]
