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
    List,
    nominal
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
    const subdomain = subdomainOf(def)
    return subdomain === "string"
        ? parseString(def as string, $)
        : subdomain === "object"
        ? parseRecord(def as Dict, $)
        : subdomain === "Array"
        ? parseTuple(def as List, $)
        : subdomain === "RegExp"
        ? { string: { regex: (def as RegExp).source } }
        : isType(def)
        ? def.node
        : throwParseError(writeBadDefinitionTypeMessage(subdomain))
}

export type inferDefinition<def, $> = isAny<def> extends true
    ? never
    : def extends inferred<infer t>
    ? t
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
    : def extends inferred<unknown>
    ? def
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

export type inferred<t> = nominal<t, "as">

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
