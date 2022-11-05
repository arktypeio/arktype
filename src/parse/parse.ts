import type { SpaceRoot } from "../space.js"
import { dynamicTypeOf } from "../utils/dynamicTypes.js"
import type { dictionary, DynamicTypeName } from "../utils/dynamicTypes.js"
import { pushKey, withoutLastKey } from "../utils/generics.js"
import type {
    evaluate,
    isAny,
    isTopType,
    keySet,
    mutable
} from "../utils/generics.js"
import { throwInternalError } from "../utils/internalArktypeError.js"
import type {
    DynamicParserContext,
    ParseError,
    StaticParserContext
} from "./common.js"
import { initializeParserContext, throwParseError } from "./common.js"
import type { Operand } from "./operand/operand.js"
import type { Attributes } from "./state/attributes.js"
import type { Scanner } from "./state/scanner.js"
import { parseString } from "./string.js"

export const parseRoot = (definition: unknown, space: SpaceRoot) => {
    const context = initializeParserContext(space)
    const rawAttributes = parseDefinition(definition, context)
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
> = isTopType<def> extends true
    ? ParseError<
          buildUninferableDefinitionMessage<
              isAny<def> extends true ? "any" : "unknown"
          >
      >
    : def extends string
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

export type buildUninferableDefinitionMessage<
    typeName extends "any" | "unknown"
> = `Cannot statically parse a definition inferred as ${typeName}. Use 'type.dynamic(...)' instead.`

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
    const requiredKeys: keySet<string> = {}
    for (const definitionKey in definition) {
        let keyName = definitionKey
        if (definitionKey.endsWith("?")) {
            keyName = definitionKey.slice(0, -1)
        } else {
            requiredKeys[definitionKey] = true
        }
        context.path = pushKey(context.path, keyName)
        props[keyName] = parseDefinition(
            definition[definitionKey],
            context
        ) as any
        context.path = withoutLastKey(context.path)
    }
    return {
        type: Array.isArray(definition) ? "array" : "dictionary",
        props,
        requiredKeys
    }
}

type parseStructure<
    def,
    context extends StaticParserContext
> = def extends TupleExpression
    ? parseTupleExpression<def, context>
    : evaluate<{
          [k in keyof def]: parseRoot<def[k], context>
      }>

const parseTupleExpression = (
    expression: TupleExpression,
    context: DynamicParserContext
) => {
    return throwInternalError("Not yet implemented.")
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
