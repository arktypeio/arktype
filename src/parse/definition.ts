import type { Node } from "../nodes/node.js"
import type { ScopeRoot } from "../scope.js"
import { throwParseError } from "../utils/errors.js"
import type {
    array,
    dict,
    evaluate,
    isAny,
    isTopType
} from "../utils/generics.js"
import type { ObjectTypeName, TypeName } from "../utils/typeOf.js"
import { typeOf, typeOfObject } from "../utils/typeOf.js"
import type {
    inferRecord,
    inferTuple,
    TupleExpression,
    validateTupleExpression
} from "./object.js"
import { parseDict, parseTuple } from "./object.js"
import type { inferString, validateString } from "./string.js"
import { parseString } from "./string.js"

export const parseDefinition = (def: unknown, scope: ScopeRoot): Node => {
    const defType = typeOf(def)
    if (defType === "string") {
        return parseString(def as string, scope)
    }
    if (defType === "object") {
        const subtype = typeOfObject(def as object)
        if (subtype === "Object") {
            return parseDict(def as dict, scope)
        } else if (subtype === "Array") {
            return parseTuple(def as array, scope)
        }
        return throwParseError(buildBadDefinitionTypeMessage(subtype))
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
    ? buildUninferableDefinitionMessage<
          isAny<def> extends true ? "any" : "unknown"
      >
    : def extends []
    ? def
    : def extends string
    ? validateString<def, scope>
    : def extends object
    ? def extends TupleExpression
        ? validateTupleExpression<def, scope>
        : def extends dict | array
        ? evaluate<{
              [k in keyof def]: validateDefinition<def[k], scope>
          }>
        : buildBadDefinitionTypeMessage<typeOfObject<def>>
    : buildBadDefinitionTypeMessage<typeOf<def>>

export type buildUninferableDefinitionMessage<
    typeName extends "any" | "unknown"
> =
    `Cannot statically parse a definition inferred as ${typeName}. Use 'type.dynamic(...)' instead.`

export const buildBadDefinitionTypeMessage = <
    actual extends TypeName | ObjectTypeName
>(
    actual: actual
): buildBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

export type buildBadDefinitionTypeMessage<
    actual extends TypeName | ObjectTypeName
> = `Type definitions must be strings or objects (was ${actual})`
