import type { TypeNode } from "../nodes/node.js"
import type { ScopeRoot } from "../scope.js"
import { type } from "../type.js"
import type {
    Domain,
    domainOf,
    ObjectSubdomain,
    Primitive,
    Subdomain
} from "../utils/domains.js"
import { subdomainOf } from "../utils/domains.js"
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
import type {
    inferTuple,
    UnknownTupleExpression,
    validateTupleExpression
} from "./tuple/tuple.js"
import { parseTuple } from "./tuple/tuple.js"

export const parseDefinition = (def: unknown, scope: ScopeRoot): TypeNode => {
    switch (subdomainOf(def)) {
        case "string":
            return parseString(def as string, scope)
        case "object":
            return parseRecord(def as Dict, scope)
        case "Array":
            return parseTuple(def as List, scope)
        case "RegExp":
            return { string: { regex: (def as RegExp).source } }
        default:
            return throwParseError(
                buildBadDefinitionTypeMessage(subdomainOf(def))
            )
    }
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
    : def extends RegExp
    ? string
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
    : def extends UnknownTupleExpression
    ? validateTupleExpression<def, scope, input>
    : def extends RegExp
    ? def
    : def extends Primitive
    ? buildBadDefinitionTypeMessage<domainOf<def>>
    : def extends RegExp
    ? def
    : def extends Function
    ? buildBadDefinitionTypeMessage<"Function">
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], scope, input>
      }>

export type buildUninferableDefinitionMessage<
    typeName extends "any" | "unknown"
> =
    `Cannot statically parse a definition inferred as ${typeName}. Use 'type.dynamic(...)' instead.`

export const buildBadDefinitionTypeMessage = <actual extends Subdomain>(
    actual: actual
): buildBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

export type buildBadDefinitionTypeMessage<actual extends Subdomain> =
    `Type definitions must be strings or objects (was ${actual})`
