import { TypeNode } from "../nodes/type.js"
import type { Scope } from "../scope.js"
import { Type } from "../type.js"
import type { Primitive } from "../utils/domains.js"
import { domainOf } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import type { evaluate, isAny, isUnknown } from "../utils/generics.js"
import type { List, Path } from "../utils/lists.js"
import { objectKindOf } from "../utils/objectKinds.js"
import type { Dict } from "../utils/records.js"
import { stringify } from "../utils/serialize.js"
import type { validateString } from "./ast/ast.js"
import type { inferTuple, validateTuple } from "./ast/tuple.js"
import { parseTuple } from "./ast/tuple.js"
import type { inferRecord } from "./record.js"
import { parseRecord } from "./record.js"
import type { AutocompletePrefix } from "./string/reduce/static.js"
import type { inferString } from "./string/string.js"
import { parseString } from "./string/string.js"

export type ParseContext = {
    path: Path
    scope: Scope
}

export const parseDefinition = (def: unknown, ctx: ParseContext): TypeNode => {
    const domain = domainOf(def)
    if (domain === "string") {
        return parseString(def as string, ctx)
    }
    if (domain !== "object") {
        return throwParseError(writeBadDefinitionTypeMessage(domain))
    }
    const objectKind = objectKindOf(def)
    switch (objectKind) {
        case "Object":
            if (def instanceof TypeNode) {
                return def
            }
            return parseRecord(def as Dict, ctx)
        case "Array":
            return parseTuple(def as List, ctx)
        case "RegExp":
            return TypeNode.from({
                basis: "string",
                regex: (def as RegExp).source
            })
        case "Function":
            if (def instanceof Type) {
                return def.root
            }
            if (isThunk(def)) {
                const returned = def()
                if (returned instanceof Type) {
                    // TODO: configs?
                    return returned.root
                }
            }
            return throwParseError(writeBadDefinitionTypeMessage("Function"))
        default:
            return throwParseError(
                writeBadDefinitionTypeMessage(objectKind ?? stringify(def))
            )
    }
}

export type inferDefinition<def, $> = isAny<def> extends true
    ? never
    : def extends Inferred<infer t> | InferredThunk<infer t>
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

// we ignore functions in validation so that cyclic thunk definitions can be inferred in scopes
export type validateDefinition<def, $> = def extends (
    ...args: never[]
) => unknown
    ? def
    : def extends Terminal
    ? def
    : def extends string
    ? validateString<def, $>
    : def extends List
    ? validateTuple<def, $>
    : def extends BadDefinitionType
    ? writeBadDefinitionTypeMessage<
          objectKindOf<def> extends string ? objectKindOf<def> : domainOf<def>
      >
    : isUnknown<def> extends true
    ? (keyof $ & string) | AutocompletePrefix
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], $>
      }>

export const inferred = Symbol("inferred")

export type Inferred<as> = {
    [inferred]?: as
}

const isThunk = (def: unknown): def is () => unknown =>
    typeof def === "function" && def.length === 0

export type InferredThunk<t = unknown> = () => Inferred<t>

type Terminal = RegExp | Inferred<unknown> | InferredThunk

type BadDefinitionType = Exclude<Primitive, string>

export const writeBadDefinitionTypeMessage = <actual extends string>(
    actual: actual
): writeBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

type writeBadDefinitionTypeMessage<actual extends string> =
    `Type definitions must be strings or objects (was ${actual})`
