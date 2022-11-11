import type { Scope } from "../scope.js"
import { dynamicTypeOf } from "../utils/dynamicTypes.js"
import type { dictionary, DynamicTypeName } from "../utils/dynamicTypes.js"
import type { keySet, mutable } from "../utils/generics.js"
import { throwInternalError } from "../utils/internalArktypeError.js"
import { throwParseError } from "./errors.js"
import type { Attributes } from "./state/attributes/attributes.js"
import type { Scanner } from "./state/scanner.js"
import { parseString } from "./string.js"

export const parseRoot = (def: unknown, scope: Scope) => {
    const rawAttributes = parseDefinition(def, scope)
    return rawAttributes
}

const parseDefinition = (def: unknown, scope: Scope): Attributes => {
    const defType = dynamicTypeOf(def)
    return defType === "string"
        ? parseString(def as string, scope)
        : defType === "dictionary" || defType === "array"
        ? parseStructure(def as any, scope)
        : throwParseError(buildBadDefinitionTypeMessage(defType))
}

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

export type buildBadDefinitionTypeMessage<actual extends DynamicTypeName> =
    `Type definitions must be strings or objects (was ${actual})`

const parseStructure = (
    def: Record<string | number, unknown>,
    scope: Scope
): Attributes => {
    if (isTupleExpression(def)) {
        return parseTupleExpression(def, scope)
    }
    const type = Array.isArray(def) ? "array" : "dictionary"
    const props: mutable<dictionary<Attributes>> = {}
    const requiredKeys: keySet<string> = {}
    for (const definitionKey in def) {
        let keyName = definitionKey
        if (definitionKey.endsWith("?")) {
            keyName = definitionKey.slice(0, -1)
        } else {
            requiredKeys[definitionKey] = true
        }
        props[keyName] = parseDefinition(def[definitionKey], scope)
    }
    return { type, props, requiredKeys }
}

const parseTupleExpression = (expression: TupleExpression, scope: Scope) => {
    return throwInternalError("Not yet implemented.")
}

// type parseTupleExpression<
//     def extends TupleExpression,
//     scope extends dictionary
// > = def[1] extends Scanner.InfixToken
//     ? def[2] extends undefined
//         ? [
//               parseRoot<def[0], scope>,
//               error<buildMissingRightOperandMessage<def[1], "">>
//           ]
//         : [parseRoot<def[0], scope>, def[1], parseRoot<def[2], scope>]
//     : [parseRoot<def[0], scope>, def[1]]

type TupleExpression = [unknown, Scanner.OperatorToken, ...unknown[]]

const isTupleExpression = (def: unknown): def is TupleExpression =>
    Array.isArray(def) && (def[1] as any) in {}
