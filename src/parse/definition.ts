import type { TypeNode } from "../nodes/node.ts"
import type { Scope } from "../scope.ts"
import { type } from "../scope.ts"
import type { Type } from "../type.ts"
import { isType } from "../type.ts"
import type { Primitive, Subdomain } from "../utils/domains.ts"
import { subdomainOf } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type {
    conform,
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
import type { Morph } from "./tuple/morph.ts"
import type {
    inferTuple,
    TupleExpression,
    validateTupleExpression
} from "./tuple/tuple.ts"
import { parseTuple } from "./tuple/tuple.ts"
import type { UnaryFunction } from "./tuple/utils.ts"

export const parseDefinition = (def: unknown, $: Scope): TypeNode => {
    switch (subdomainOf(def)) {
        case "string":
            return parseString(def as string, $)
        case "object":
            return isType(def) ? def.root : parseRecord(def as Dict, $)
        case "Array":
            return parseTuple(def as List, $)
        case "RegExp":
            return { string: { regex: (def as RegExp).source } }
        default:
            return throwParseError(
                buildBadDefinitionTypeMessage(subdomainOf(def))
            )
    }
}

export type inferDefinition<def, $> = isAny<def> extends true
    ? def
    : def extends string
    ? inferString<def, $>
    : def extends List
    ? inferTuple<def, $>
    : def extends Function
    ? def extends Type
        ? def["infer"]
        : def extends (In: unknown) => In is infer narrowed
        ? narrowed
        : def extends (In: unknown) => infer morphed
        ? (In: unknown) => morphed
        : never
    : def extends RegExp
    ? string
    : def extends Dict
    ? inferRecord<def, $>
    : never

export type validateDefinition<def, $> =
    | ((In: unknown) => unknown)
    | (def extends []
          ? []
          : def extends string
          ? validateString<def, $>
          : def extends TupleExpression
          ? validateTupleExpression<def, $>
          : def extends TerminalObject
          ? def
          : def extends BadDefinitionType
          ? buildBadDefinitionTypeMessage<subdomainOf<def>>
          : isUnknown<def> extends true
          ? unknownDefinitionMessage
          : evaluate<{
                [k in keyof def]: validateDefinition<def[k], $>
            }>)

export type unknownDefinitionMessage =
    `Cannot statically parse a definition inferred as unknown. Use 'type.dynamic(...)' instead.`

export type TerminalObject = Type | RegExp

export type BadDefinitionType = Exclude<Primitive, string> | Function

export const buildBadDefinitionTypeMessage = <actual extends Subdomain>(
    actual: actual
): buildBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

export type buildBadDefinitionTypeMessage<actual extends Subdomain> =
    `Type definitions must be strings or objects (was ${actual})`
