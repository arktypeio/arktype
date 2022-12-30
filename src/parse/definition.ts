import type { TypeNode } from "../nodes/node.ts"
import type { Scope } from "../scope.ts"
import type { Type } from "../type.ts"
import type { Primitive, Subdomain } from "../utils/domains.ts"
import { subdomainOf } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type {
    Dict,
    evaluate,
    isAny,
    isTopType,
    List
} from "../utils/generics.ts"
import type { inferRecord } from "./record.ts"
import { parseRecord } from "./record.ts"
import type { inferString, validateString } from "./string/string.ts"
import { parseString } from "./string/string.ts"
import type {
    inferTuple,
    TupleExpression,
    validateTupleExpression
} from "./tuple/tuple.ts"
import { parseTuple } from "./tuple/tuple.ts"

export const parseDefinition = (def: unknown, scope: Scope): TypeNode => {
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

export type inferDefinition<def, aliases> = isTopType<def> extends true
    ? never
    : def extends string
    ? inferString<def, aliases>
    : def extends List
    ? inferTuple<def, aliases>
    : def extends Type
    ? def["infer"]
    : def extends RegExp
    ? string
    : def extends Dict
    ? inferRecord<def, aliases>
    : never

export type validateDefinition<def, aliases> = isTopType<def> extends true
    ? buildUninferableDefinitionMessage<def>
    : def extends []
    ? []
    : def extends string
    ? validateString<def, aliases>
    : def extends TupleExpression
    ? validateTupleExpression<def, aliases>
    : def extends TerminalObject
    ? def
    : def extends BadDefinitionType
    ? buildBadDefinitionTypeMessage<subdomainOf<def>>
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], aliases>
      }>

export type buildUninferableDefinitionMessage<def> =
    `Cannot statically parse a definition inferred as ${isAny<def> extends true
        ? "any"
        : "unknown"}. Use 'type.dynamic(...)' instead.`

export type TerminalObject = Type | RegExp

export type BadDefinitionType = Exclude<Primitive, string> | Function

export const buildBadDefinitionTypeMessage = <actual extends Subdomain>(
    actual: actual
): buildBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

export type buildBadDefinitionTypeMessage<actual extends Subdomain> =
    `Type definitions must be strings or objects (was ${actual})`
