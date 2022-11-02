import type { Attributes } from "../attributes/shared.js"
import type { dictionary, DynamicTypeName, evaluate } from "../internal.js"
import { dynamicTypeOf, pushKey, withoutLastKey } from "../internal.js"
import type { SpaceRoot } from "../space.js"
import type {
    DynamicParserContext,
    ParseError,
    StaticParserContext
} from "./common.js"
import { initializeParserContext, throwParseError } from "./common.js"
import type { Operand } from "./operand/operand.js"
import type { Scanner } from "./state/scanner.js"
import { parseString } from "./string.js"

export const parseRoot = (definition: unknown, space: SpaceRoot) => {
    const rawAttributes = parseDefinition(
        definition,
        initializeParserContext(space)
    )
    return rawAttributes
}

export type parseRoot<
    def,
    context extends StaticParserContext
> = parseDefinition<def, context>

const parseDefinition = (
    def: unknown,
    context: DynamicParserContext
): Attributes => {
    const defType = dynamicTypeOf(def)
    return defType === "string"
        ? parseString(def as string, context)
        : defType === "dictionary" || defType === "array"
        ? parseStructure(def as any, context)
        : throwParseError(buildBadDefinitionTypeMessage(defType))
}

type parseDefinition<
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

const parseStructure = (
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

type parseStructure<
    def,
    context extends StaticParserContext
> = def extends TupleExpression
    ? parseTupleExpression<def, context>
    : evaluate<{
          [K in keyof def]: parseRoot<def[K], context>
      }>

const parseTupleExpression = (
    expression: TupleExpression,
    context: DynamicParserContext
) => {
    console.log(expression, context)
    return {} as Attributes
}

type parseTupleExpression<
    def extends TupleExpression,
    context extends StaticParserContext
> = def[1] extends Scanner.InfixToken
    ? def[2] extends undefined
        ? [
              parseRoot<def[0], context>,
              ParseError<Operand.buildMissingRightOperandMessage<def[1], "">>
          ]
        : [parseRoot<def[0], context>, def[1], parseRoot<def[2], context>]
    : [parseRoot<def[0], context>, def[1]]

type TupleExpression = [unknown, Scanner.OperatorToken, ...unknown[]]

const isTupleExpression = (def: unknown): def is TupleExpression =>
    Array.isArray(def) && (def[1] as any) in {}
