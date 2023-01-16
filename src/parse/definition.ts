import type { TypeNode } from "../nodes/node.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Type } from "../type.ts"
import { isType } from "../type.ts"
import type { Primitive, Subdomain } from "../utils/domains.ts"
import { subdomainOf } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type {
    Dict,
    evaluate,
    isAny,
    isUnknown,
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

export const parseDefinition = (def: unknown, $: ScopeRoot): TypeNode => {
    switch (subdomainOf(def)) {
        case "string":
            return parseString(def as string, $)
        case "object":
            return isType(def) ? def.node : parseRecord(def as Dict, $)
        case "Array":
            return parseTuple(def as List, $)
        case "RegExp":
            return { string: { regex: (def as RegExp).source } }
        default:
            return throwParseError(
                writeBadDefinitionTypeMessage(subdomainOf(def))
            )
    }
}

export type inferDefinition<def, $> = isAny<def> extends true
    ? never
    : // TODO: test perf diff between Type/infer
    def extends { t: infer t }
    ? t
    : def extends string
    ? inferString<def, $>
    : def extends List
    ? inferTuple<def, $>
    : def extends RegExp
    ? string
    : def extends Dict
    ? inferRecord<def, $>
    : never

export type validateDefinition<def, $> = def extends []
    ? []
    : def extends string
    ? validateString<def, $>
    : def extends TupleExpression
    ? validateTupleExpression<def, $>
    : def extends TerminalObject
    ? def
    : def extends BadDefinitionType
    ? writeBadDefinitionTypeMessage<subdomainOf<def>>
    : isUnknown<def> extends true
    ? unknownDefinitionMessage
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], $>
      }>

export type unknownDefinitionMessage =
    `Cannot statically parse a definition inferred as unknown. Use 'type.dynamic(...)' instead.`

export type TerminalObject = Type | RegExp

export type BadDefinitionType = Exclude<Primitive, string> | Function

export const writeBadDefinitionTypeMessage = <actual extends Subdomain>(
    actual: actual
): writeBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

export type writeBadDefinitionTypeMessage<actual extends Subdomain> =
    `Type definitions must be strings or objects (was ${actual})`
