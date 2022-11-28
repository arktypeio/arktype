import type { Node } from "../nodes/node.js"
import type { ScopeRoot } from "../scope.js"
import type { array, dict, TypeName } from "../utils/typeOf.js"
import { subtypeOf, typeOf } from "../utils/typeOf.js"
import { throwParseError } from "../utils/errors.js"
import type { error, evaluate, isAny, isTopType } from "../utils/generics.js"
import type { inferString, validateString } from "./string.js"
import { parseString } from "./string.js"
import type { inferRecord, inferTuple } from "./structure.js"
import { parseDict, parseTuple } from "./structure.js"

export const parseDefinition = (def: unknown, scope: ScopeRoot): Node => {
    const defType = typeOf(def)
    if (defType === "string") {
        return parseString(def as string, scope)
    }
    if (defType === "object") {
        const subtype = subtypeOf(def as object)
        if (subtype === "array") {
            return parseTuple(def as array, scope)
        } else if (subtype === "base") {
            return parseDict(def as dict, scope)
        }
        return throwParseError(buildBadDefinitionTypeMessage("function"))
    }
    return throwParseError(buildBadDefinitionTypeMessage(defType))
}

export type inferDefinition<
    def,
    scope extends dict,
    aliases
> = isTopType<def> extends true
    ? never
    : def extends string
    ? inferString<def, scope, aliases>
    : def extends array
    ? inferTuple<def, scope, aliases>
    : def extends dict
    ? inferRecord<def, scope, aliases>
    : never

export type validateDefinition<
    def,
    scope extends dict
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
    ? buildBadDefinitionTypeMessage<typeOf<def>>
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
    actual extends TypeName | "function"
>(
    actual: actual
): buildBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

export type buildBadDefinitionTypeMessage<
    actual extends TypeName | "function"
> = `Type definitions must be strings or objects (was ${actual})`
