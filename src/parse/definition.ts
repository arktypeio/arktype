import type { Node } from "../nodes/node.js"
import type { TypeNode } from "../nodes/type.js"
import type { Type } from "../type.js"
import type { Primitive } from "../utils/domains.js"
import { domainOf } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import type {
    Dict,
    evaluate,
    isAny,
    isUnknown,
    List,
    stringKeyOf
} from "../utils/generics.js"
import { objectKindOf } from "../utils/objectKinds.js"
import type { Path } from "../utils/paths.js"
import { stringify } from "../utils/serialize.js"
import type { validateString } from "./ast/ast.js"
import type {
    inferTuple,
    TupleExpression,
    validateTupleExpression
} from "./ast/tuple.js"
import { parseTuple } from "./ast/tuple.js"
import type { inferRecord } from "./record.js"
import { parseRecord } from "./record.js"
import type { inferString } from "./string/string.js"
import { parseString } from "./string/string.js"

export type ParseContext = {
    path: Path
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
            return parseRecord(def as Dict, ctx)
        case "Array":
            return parseTuple(def as List, ctx)
        case "RegExp":
            return new Branch({
                domain: "string",
                regex: [(def as RegExp).source]
            })
        case "Function":
            if (isThunk(def)) {
                const returned = def()
                if (isType(returned)) {
                    return ctx.type.scope.addAnonymousTypeReference(
                        returned,
                        ctx
                    )
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
    : def extends Infer<infer t> | InferredThunk<infer t>
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
export type validateDefinition<def, $> = def extends (...args: any[]) => any
    ? def
    : def extends Terminal
    ? def
    : def extends string
    ? validateString<def, $>
    : def extends TupleExpression
    ? validateTupleExpression<def, $>
    : def extends BadDefinitionType
    ? writeBadDefinitionTypeMessage<
          objectKindOf<def> extends string ? objectKindOf<def> : domainOf<def>
      >
    : isUnknown<def> extends true
    ? stringKeyOf<$>
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], $>
      }>

export const as = Symbol("as")

export type Infer<t> = {
    [as]?: t
}

const isThunk = (def: unknown): def is () => unknown =>
    typeof def === "function" && def.length === 0

type InferredThunk<t = unknown> = () => Infer<t>

type Terminal = RegExp | Infer<unknown> | InferredThunk

type BadDefinitionType = Exclude<Primitive, string>

export const writeBadDefinitionTypeMessage = <actual extends string>(
    actual: actual
): writeBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

type writeBadDefinitionTypeMessage<actual extends string> =
    `Type definitions must be strings or objects (was ${actual})`
