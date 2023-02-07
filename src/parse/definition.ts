import type { Type } from "../main.ts"
import { isType } from "../main.ts"
import type { TypeNode } from "../nodes/node.ts"
import type { DefaultObjectKind, Primitive } from "../utils/domains.ts"
import { objectKindOf } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type {
    Dict,
    evaluateObject,
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
    path: Path
}

export const parseDefinition = (def: unknown, ctx: ParseContext): TypeNode => {
    const objectKind = objectKindOf(def)
    return objectKind === "string"
        ? parseString(def as string, ctx)
        : objectKind === "object"
        ? parseRecord(def as Dict, ctx)
        : objectKind === "Array"
        ? parseTuple(def as List, ctx)
        : objectKind === "RegExp"
        ? { string: { regex: (def as RegExp).source } }
        : isType(def)
        ? def.node
        : throwParseError(writeBadDefinitionTypeMessage(objectKind))
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
    ? writeBadDefinitionTypeMessage<kindOf<def>>
    : isUnknown<def> extends true
    ? unknownDefinitionMessage
    : evaluateObject<{
          [k in keyof def]: validateDefinition<def[k], $>
      }>

export const as = Symbol("as")

export type inferred<t> = {
    [as]?: t
}

export const unknownDefinitionMessage =
    "Cannot statically parse a definition inferred as unknown. Consider using 'as inferred<...>' to cast it."

export type unknownDefinitionMessage = typeof unknownDefinitionMessage

type Terminal = RegExp | inferred<unknown>

type BadDefinitionType = Exclude<Primitive, string> | Function

export const writeBadDefinitionTypeMessage = <actual extends DefaultObjectKind>(
    actual: actual
): writeBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

type writeBadDefinitionTypeMessage<actual extends DefaultObjectKind> =
    `Type definitions must be strings or objects (was ${actual})`
