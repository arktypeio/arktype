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
import type { inferString, validateString } from "./string/string.js"
import { parseString } from "./string/string.js"
import type { inferTuple, validateTuple } from "./tuple/tuple.js"
import { parseTuple } from "./tuple/tuple.js"

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
    aliases,
    input extends boolean
> = isTopType<def> extends true
    ? never
    : def extends string
    ? inferString<def, scope, aliases, input>
    : def extends List
    ? inferTuple<def, scope, aliases, input>
    : def extends Dict
    ? inferRecord<def, scope, aliases, input>
    : never

export type validateDefinition<
    def,
    scope extends Dict,
    input extends boolean
> = isTopType<def> extends true
    ? buildUninferableDefinitionMessage<
          isAny<def> extends true ? "any" : "unknown"
      >
    : def extends []
    ? def
    : def extends string
    ? validateString<def, scope, input>
    : def extends List
    ? validateTuple<def, scope, input>
    : def extends Primitive
    ? buildBadDefinitionTypeMessage<domainOf<def>>
    : def extends Function
    ? buildBadDefinitionTypeMessage<"Function">
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], scope, input>
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
