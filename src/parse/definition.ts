import type { domainOf, Primitive } from "../../dev/utils/src/domains.js"
import type { error } from "../../dev/utils/src/errors.js"
import { throwParseError } from "../../dev/utils/src/errors.js"
import { isThunk } from "../../dev/utils/src/functions.js"
import type {
    defined,
    equals,
    evaluate,
    isAny,
    isUnknown
} from "../../dev/utils/src/generics.js"
import type { List } from "../../dev/utils/src/lists.js"
import { objectKindOf } from "../../dev/utils/src/objectKinds.js"
import type {
    Dict,
    optionalKeyOf,
    requiredKeyOf
} from "../../dev/utils/src/records.js"
import { stringify } from "../../dev/utils/src/serialize.js"
import { hasArkKind } from "../compile/registry.js"
import type { TypeNode } from "../nodes/composite/type.js"
import { node } from "../nodes/composite/type.js"
import type { ParseContext } from "../scope.js"
import { Type } from "../type.js"
import type { validateString } from "./ast/ast.js"
import type {
    inferObjectLiteral,
    validateObjectLiteral
} from "./objectLiteral.js"
import { parseObjectLiteral } from "./objectLiteral.js"
import type { BaseCompletions, inferString } from "./string/string.js"
import type { inferTuple, TupleExpression, validateTuple } from "./tuple.js"
import { parseTuple } from "./tuple.js"

export const parseObject = (def: object, ctx: ParseContext): TypeNode => {
    const objectKind = objectKindOf(def)
    switch (objectKind) {
        case "Object":
            if (hasArkKind(def, "node") && def.hasKind("type")) {
                return def
            }
            return parseObjectLiteral(def as Dict, ctx)
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

export type inferDefinition<def, $, args> = isAny<def> extends true
    ? never
    : def extends CastTo<infer t> | ThunkCast<infer t>
    ? t
    : def extends string
    ? inferString<def, $, args>
    : def extends List
    ? inferTuple<def, $, args>
    : def extends RegExp
    ? string
    : def extends Dict
    ? inferObjectLiteral<def, $, args>
    : never

export type validateDefinition<def, $, args> = null extends undefined
    ? `'strict' or 'strictNullChecks' must be set to true in your tsconfig's 'compilerOptions'`
    : def extends Terminal
    ? def
    : def extends string
    ? validateString<def, $, args> extends error<infer message>
        ? message
        : def
    : def extends List
    ? validateTuple<def, $, args>
    : def extends BadDefinitionType
    ? writeBadDefinitionTypeMessage<
          objectKindOf<def> extends string ? objectKindOf<def> : domainOf<def>
      >
    : isUnknown<def> extends true
    ? // this allows the initial list of autocompletions to be populated when a user writes "type()",
      // before having specified a definition
      BaseCompletions<$, args> | {}
    : validateObjectLiteral<def, $, args>

export type validateDeclared<declared, def, $, args> =
    def extends validateDefinition<def, $, args>
        ? validateInference<def, declared, $, args>
        : validateDefinition<def, $, args>

type validateInference<def, declared, $, args> = def extends
    | RegExp
    | CastTo<unknown>
    | ThunkCast
    | TupleExpression
    ? validateShallowInference<def, declared, $, args>
    : def extends readonly unknown[]
    ? declared extends readonly unknown[]
        ? {
              [i in keyof declared]: i extends keyof def
                  ? validateInference<def[i], declared[i], $, args>
                  : unknown
          }
        : evaluate<declarationMismatch<def, declared, $, args>>
    : def extends object
    ? evaluate<
          {
              [k in requiredKeyOf<declared>]: k extends keyof def
                  ? validateInference<def[k], declared[k], $, args>
                  : unknown
          } & {
              [k in optionalKeyOf<declared> &
                  string as `${k}?`]: `${k}?` extends keyof def
                  ? validateInference<
                        def[`${k}?`],
                        defined<declared[k]>,
                        $,
                        args
                    >
                  : unknown
          }
      >
    : validateShallowInference<def, declared, $, args>

type validateShallowInference<def, declared, $, args> = equals<
    inferDefinition<def, $, args>,
    declared
> extends true
    ? def
    : evaluate<declarationMismatch<def, declared, $, args>>

type declarationMismatch<def, declared, $, args> = {
    declared: declared
    inferred: inferDefinition<def, $, args>
}

// functions are ignored in validation so that cyclic thunk definitions can be
// inferred in scopes
type Terminal = RegExp | CastTo<unknown> | ((...args: never[]) => unknown)

// ideally this could be just declared since it is not used at runtime,
// but it doesn't play well with typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/4608
// easiest solution seems to be just having it declared as a value so it doesn't break when we import at runtime
export const inferred = Symbol("inferred")

export type CastTo<t> = {
    [inferred]?: t
}

export type ThunkCast<t = unknown> = () => CastTo<t>

type BadDefinitionType = Exclude<Primitive, string>

export const writeBadDefinitionTypeMessage = <actual extends string>(
    actual: actual
): writeBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

type writeBadDefinitionTypeMessage<actual extends string> =
    `Type definitions must be strings or objects (was ${actual})`
