import type { Node } from "../nodes/node.js"
import type { ScopeRoot } from "../scope.js"
import type { array, DataTypeName, record } from "../utils/dataTypes.js"
import { dataTypeOf, objectSubtypeOf } from "../utils/dataTypes.js"
import { throwParseError } from "../utils/errors.js"
import type { error, evaluate, isAny, isTopType } from "../utils/generics.js"
import type { inferString, validateString } from "./string.js"
import { parseString } from "./string.js"
import type { inferRecord, inferTuple } from "./structure.js"
import { parseRecord, parseTuple } from "./structure.js"

export const parseDefinition = (def: unknown, scope: ScopeRoot): Node => {
    const defType = dataTypeOf(def)
    if (defType === "string") {
        return parseString(def as string, scope)
    }
    if (defType === "object") {
        const subtype = objectSubtypeOf(def as object)
        if (subtype === "record") {
            return parseRecord(def as record, scope)
        } else if (subtype === "array") {
            return parseTuple(def as array, scope)
        }
        return throwParseError(buildBadDefinitionTypeMessage("function"))
    }
    return throwParseError(buildBadDefinitionTypeMessage(defType))
}

export type inferDefinition<
    def,
    scope extends record,
    aliases
> = isTopType<def> extends true
    ? never
    : def extends string
    ? inferString<def, scope, aliases>
    : def extends array
    ? inferTuple<def, scope, aliases>
    : def extends record
    ? inferRecord<def, scope, aliases>
    : never

export type validateDefinition<
    def,
    scope extends record
> = isTopType<def> extends true
    ? error<
          buildUninferableDefinitionMessage<
              isAny<def> extends true ? "any" : "unknown"
          >
      >
    : def extends []
    ? def
    : def extends string
    ? validateString<def, scope>
    : def extends BadDefinitionType
    ? buildBadDefinitionTypeMessage<dataTypeOf<def>>
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], scope>
      }>

type BadDefinitionType =
    | undefined
    | null
    | boolean
    | number
    | bigint
    | Function
    | symbol

export type buildUninferableDefinitionMessage<
    typeName extends "any" | "unknown"
> =
    `Cannot statically parse a definition inferred as ${typeName}. Use 'type.dynamic(...)' instead.`

export const buildBadDefinitionTypeMessage = <
    actual extends DataTypeName | "function"
>(
    actual: actual
): buildBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

export type buildBadDefinitionTypeMessage<
    actual extends DataTypeName | "function"
> = `Type definitions must be strings or objects (was ${actual})`
