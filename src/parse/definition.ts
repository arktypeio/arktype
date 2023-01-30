import type { Scope, Type } from "../main.ts"
import { isType } from "../main.ts"
import type { TypeNode } from "../nodes/node.ts"
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
import type { Path } from "../utils/paths.ts"
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

export type ParseContext = {
    type: Type
    $: Scope
    path: Path
}

export const parseDefinition = (def: unknown, ctx: ParseContext): TypeNode => {
    const subdomain = subdomainOf(def)
    return subdomain === "string"
        ? parseString(def as string, ctx)
        : subdomain === "object"
        ? parseRecord(def as Dict, ctx)
        : subdomain === "Array"
        ? parseTuple(def as List, ctx)
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
    : def extends string
    ? inferString<def, $>
    : def extends List
    ? inferTuple<def, $>
    : def extends RegExp
    ? string
    : def extends Dict
    ? inferRecord<def, $>
    : never

export type validateDefinition<def, $> = def extends Terminal
    ? def
    : def extends string
    ? validateString<def, $>
    : def extends TupleExpression
    ? validateTupleExpression<def, $>
    : def extends BadDefinitionType
    ? writeBadDefinitionTypeMessage<subdomainOf<def>>
    : isUnknown<def> extends true
    ? unknownDefinitionMessage
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], $>
      }>

export const t = Symbol()

export type inferred<t> = {
    [t]?: t
}

export type unknownDefinitionMessage =
    `Cannot statically parse a definition inferred as unknown. Consider using 'as inferred<...>' to cast it.`

type Terminal = Type | RegExp | inferred<unknown>

type BadDefinitionType = Exclude<Primitive, string> | Function

export const writeBadDefinitionTypeMessage = <actual extends Subdomain>(
    actual: actual
): writeBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

type writeBadDefinitionTypeMessage<actual extends Subdomain> =
    `Type definitions must be strings or objects (was ${actual})`
