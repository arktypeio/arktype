import type { TypeNode } from "../nodes/composite/type.js"
import { node } from "../nodes/composite/type.js"
import { isNode } from "../nodes/node.js"
import type { Scope } from "../scope.js"
import { Type } from "../type.js"
import type { Primitive } from "../../dev/utils/domains.js"
import { domainOf } from "../../dev/utils/domains.js"
import { throwParseError } from "../../dev/utils/errors.js"
import type { isAny, isUnknown } from "../../dev/utils/generics.js"
import type { List, Path } from "../../dev/utils/lists.js"
import { objectKindOf } from "../../dev/utils/objectKinds.js"
import type { Dict } from "../../dev/utils/records.js"
import { stringify } from "../../dev/utils/serialize.js"
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
            if (isNode(def) && def.hasKind("type")) {
                return def
            }
            return parseRecord(def as Dict, ctx)
        case "Array":
            return parseTuple(def as List, ctx)
        case "RegExp":
            return node({
                basis: "string",
                regex: (def as RegExp).source
            })
        case "Function":
            if (def instanceof Type) {
                return def.root
            }
            // TODO: only handle thunks at scope root?
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

export type validateDefinition<def, $> = def extends Terminal
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
    ? // this allows the initial list of autocompletions to be populated when a user writes "type()", before having specified a definition
    (keyof $ & string) | AutocompletePrefix | {}
    : {
        [k in keyof def]: validateDefinition<def[k], $>
    }

// functions are ignored in validation so that cyclic thunk definitions can be
// inferred in scopes
type Terminal = RegExp | Inferred<unknown> | ((...args: never[]) => unknown)

export declare const inferred: unique symbol

export type Inferred<as> = {
    [inferred]?: as
}

const isThunk = (def: unknown): def is () => unknown =>
    typeof def === "function" && def.length === 0

export type InferredThunk<t = unknown> = () => Inferred<t>

type BadDefinitionType = Exclude<Primitive, string>

export const writeBadDefinitionTypeMessage = <actual extends string>(
    actual: actual
): writeBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

type writeBadDefinitionTypeMessage<actual extends string> =
    `Type definitions must be strings or objects (was ${actual})`
