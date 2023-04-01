import { Branch } from "../nodes/branch.ts"
import type { Node } from "../nodes/node.ts"
import type { Type } from "../scopes/type.ts"
import { isType } from "../scopes/type.ts"
import type { Primitive } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type {
    Dict,
    evaluate,
    isAny,
    isUnknown,
    List
} from "../utils/generics.ts"
import { objectKindOf } from "../utils/objectKinds.ts"
import type { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type { validateString } from "./ast/ast.ts"
import type {
    inferTuple,
    TupleExpression,
    validateTupleExpression
} from "./ast/tuple.ts"
import { parseTuple } from "./ast/tuple.ts"
import type { inferRecord } from "./record.ts"
import { parseRecord } from "./record.ts"
import type { inferString } from "./string/string.ts"
import { parseString } from "./string/string.ts"

export type ParseContext = {
    type: Type
    path: Path
}

export const parseDefinition = (def: unknown, ctx: ParseContext): Node => {
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
            if (isType(def)) {
                return ctx.type.scope.addAnonymousTypeReference(def, ctx)
            }
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
    ? unknownDefinitionMessage
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], $>
      }>

export const as = Symbol("as")

export type Infer<t> = {
    [as]?: t
}

export const unknownDefinitionMessage =
    "Cannot statically parse a definition inferred as unknown. Consider using 'as Infer<...>' to cast it."

export type unknownDefinitionMessage = typeof unknownDefinitionMessage

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
