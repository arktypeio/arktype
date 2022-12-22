import type { TypeNode } from "../nodes/node.js"
import type { ScopeRoot } from "../scope.js"
import type { Domain, ObjectSubdomain, Primitive } from "../utils/domains.js"
import { domainOf, subdomainOf } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import type {
    Dict,
    evaluate,
    isAny,
    isTopType,
    List
} from "../utils/generics.js"
import type { inferRecord } from "./record.js"
import { parseRecord } from "./record.js"
import type { inferString, validateString } from "./string.js"
import { parseString } from "./string.js"
import type { inferTuple, validateTuple } from "./tuple.js"
import { parseTuple } from "./tuple.js"

export const parseDefinition = (def: unknown, scope: ScopeRoot): TypeNode => {
    const domain = domainOf(def)
    if (domain === "string") {
        return parseString(def as string, scope)
    }
    if (domain === "object") {
        const objectDomain = subdomainOf(def as object)
        if (objectDomain === "object") {
            return parseRecord(def as Dict, scope)
        } else if (objectDomain === "Array") {
            return parseTuple(def as List, scope)
        }
        return throwParseError(buildBadDefinitionTypeMessage(objectDomain))
    }
    return throwParseError(buildBadDefinitionTypeMessage(domain))
}

export type inferDefinition<
    def,
    scope extends Dict,
    aliases
> = isTopType<def> extends true
    ? never
    : def extends string
    ? inferString<def, scope, aliases>
    : def extends List
    ? inferTuple<def, scope, aliases>
    : def extends Dict
    ? inferRecord<def, scope, aliases>
    : never

export type validateDefinition<
    def,
    scope extends Dict
> = isTopType<def> extends true
    ? buildUninferableDefinitionMessage<
          isAny<def> extends true ? "any" : "unknown"
      >
    : def extends []
    ? def
    : def extends string
    ? validateString<def, scope>
    : def extends List
    ? validateTuple<def, scope>
    : def extends Primitive
    ? buildBadDefinitionTypeMessage<domainOf<def>>
    : def extends Function
    ? buildBadDefinitionTypeMessage<"Function">
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], scope>
      }>

export type buildUninferableDefinitionMessage<
    typeName extends "any" | "unknown"
> =
    `Cannot statically parse a definition inferred as ${typeName}. Use 'type.dynamic(...)' instead.`

export const buildBadDefinitionTypeMessage = <
    actual extends Domain | ObjectSubdomain
>(
    actual: actual
): buildBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

export type buildBadDefinitionTypeMessage<
    actual extends Domain | ObjectSubdomain
> = `Type definitions must be strings or objects (was ${actual})`
