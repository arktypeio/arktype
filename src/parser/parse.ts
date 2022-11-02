import type { Attributes } from "../attributes/shared.js"
import type { dictionary, DynamicTypeName, evaluate } from "../internal.js"
import { dynamicTypeOf, pushKey, withoutLastKey } from "../internal.js"
import type {
    DynamicParserContext,
    ParseError,
    StaticParserContext
} from "./common.js"
import { throwParseError } from "./common.js"
import { fullParse } from "./full.js"
import { tryNaiveParse } from "./naive.js"
import type { Operand } from "./operand/operand.js"
import type { Scanner } from "./state/scanner.js"

export const parseDefinition = (
    def: unknown,
    context: DynamicParserContext
): Attributes => {
    const defType = dynamicTypeOf(def)
    return defType === "string"
        ? context.spaceRoot.parseMemoizable(def as string)
        : defType === "dictionary" || defType === "array"
        ? parseStructure(def as any, context)
        : throwParseError(buildBadDefinitionTypeMessage(defType))
}

export type parseDefinition<
    def,
    context extends StaticParserContext
> = def extends string
    ? parseString<def, context>
    : def extends BadDefinitionType
    ? ParseError<buildBadDefinitionTypeMessage<dynamicTypeOf<def>>>
    : parseStructure<def, context>

export type BadDefinitionType =
    | undefined
    | null
    | boolean
    | number
    | bigint
    | Function
    | symbol

export const buildBadDefinitionTypeMessage = <actual extends DynamicTypeName>(
    actual: actual
): buildBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

type buildBadDefinitionTypeMessage<actual extends DynamicTypeName> =
    `Type definitions must be strings or objects (was ${actual})`

export const parseStructure = (
    definition: Record<string | number, unknown>,
    context: DynamicParserContext
): Attributes => {
    if (isTupleExpression(definition)) {
        return parseTupleExpression(definition, context)
    }
    const props: dictionary<Attributes> = {}
    for (const k in definition) {
        context.path = pushKey(context.path, k)
        props[k] = parseDefinition(definition[k], context) as any
        context.path = withoutLastKey(context.path)
    }
    return {
        type: Array.isArray(definition) ? "array" : "dictionary",
        props
    }
}

export type parseStructure<
    def,
    context extends StaticParserContext
> = def extends TupleExpression
    ? parseTupleExpression<def, context>
    : evaluate<{
          [K in keyof def]: parseDefinition<def[K], context>
      }>

export type parseString<
    def extends string,
    context extends StaticParserContext
> = tryNaiveParse<def, context>

export type validateString<
    def extends string,
    context extends StaticParserContext
> = parseString<def, context> extends ParseError<infer Message> ? Message : def

export const parseString = (def: string, context: DynamicParserContext) =>
    tryNaiveParse(def, context) ?? fullParse(def, context)

export const parseTupleExpression = (
    [definition, token, ...args]: TupleExpression,
    context: DynamicParserContext
) => ({} as Attributes)

export type parseTupleExpression<
    def extends TupleExpression,
    context extends StaticParserContext
> = def[1] extends Scanner.InfixToken
    ? def[2] extends undefined
        ? [
              parseDefinition<def[0], context>,
              ParseError<Operand.buildMissingRightOperandMessage<def[1], "">>
          ]
        : [
              parseDefinition<def[0], context>,
              def[1],
              parseDefinition<def[2], context>
          ]
    : [parseDefinition<def[0], context>, def[1]]

export type TupleExpression = [unknown, Scanner.OperatorToken, ...unknown[]]

export const isTupleExpression = (def: unknown): def is TupleExpression =>
    Array.isArray(def) && (def[1] as any) in {}
