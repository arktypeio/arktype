import type { TypeNode } from "../nodes/node.ts"
import type { Scope } from "../scope.ts"
import type { Type } from "../type.ts"
import { type } from "../type.ts"
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
    inferTraitsTuple,
    TraitsTuple,
    validateTraitsTuple
} from "./tuple/traits.ts"
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

export type inferRoot<def, s extends Scope> = def extends TraitsTuple
    ? inferTraitsTuple<def, s>
    : inferDefinition<def, s>

export type validateRoot<def, s extends Scope> = isTopType<def> extends true
    ? buildUninferableDefinitionMessage<def>
    : def extends TraitsTuple
    ? validateTraitsTuple<def, s>
    : validateDefinition<def, s>

export type inferDefinition<def, s extends Scope> = isTopType<def> extends true
    ? never
    : def extends string
    ? inferString<def, s>
    : def extends List
    ? inferTuple<def, s>
    : def extends Type
    ? def["infer"]
    : def extends RegExp
    ? string
    : def extends Dict
    ? inferRecord<def, s>
    : never

export type validateDefinition<
    def,
    s extends Scope
> = isTopType<def> extends true
    ? buildUninferableDefinitionMessage<def>
    : def extends []
    ? []
    : def extends string
    ? validateString<def, s>
    : def extends TupleExpression
    ? validateTupleExpression<def, s>
    : def extends TerminalObject
    ? def
    : def extends BadDefinitionType
    ? buildBadDefinitionTypeMessage<subdomainOf<def>>
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], s>
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
