import { isNode, schema, type Root } from "@arktype/schema"
import {
	isThunk,
	objectKindOf,
	stringify,
	throwParseError,
	type Dict,
	type ErrorMessage,
	type List,
	type Primitive,
	type defined,
	type equals,
	type evaluate,
	type isAny,
	type isUnknown,
	type objectKindOrDomainOf,
	type optionalKeyOf,
	type requiredKeyOf
} from "@arktype/util"
import type { ParseContext } from "../scope.js"
import type { type } from "../scopes/ark.js"
import { Type } from "../type.js"
import {
	parseObjectLiteral,
	type inferObjectLiteral,
	type validateObjectLiteral
} from "./objectLiteral.js"
import type { validateString } from "./semantic/validate.js"
import type { BaseCompletions, inferString } from "./string/string.js"
import {
	parseTuple,
	type TupleExpression,
	type inferTuple,
	type validateTuple
} from "./tuple.js"

export const parseObject = (def: object, ctx: ParseContext): Root => {
	const objectKind = objectKindOf(def)
	switch (objectKind) {
		case undefined:
			if (isNode(def)) {
				return def as Root
			}
			return parseObjectLiteral(def as Dict, ctx)
		case "Array":
			return parseTuple(def as List, ctx)
		case "RegExp":
			return schema({ basis: "string", pattern: def as RegExp })
		case "Function":
			const resolvedDef = isThunk(def) ? def() : def
			if (resolvedDef instanceof Type) {
				return resolvedDef.root
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
	: def extends type.cast<infer t> | ThunkCast<infer t>
	  ? t
	  : def extends string
	    ? inferString<def, $, args>
	    : def extends readonly unknown[]
	      ? inferTuple<def, $, args>
	      : def extends RegExp
	        ? string
	        : def extends object
	          ? inferObjectLiteral<def, $, args>
	          : never

export type validateDefinition<def, $, args> = null extends undefined
	? ErrorMessage<`'strict' or 'strictNullChecks' must be set to true in your tsconfig's 'compilerOptions'`>
	: [def] extends [Terminal]
	  ? unknown extends def
			? // if def is any, never is the only way we can make validation fail
			  // since any would be assignable to a standard error message
			  never
			: def
	  : def extends string
	    ? validateString<def, $, args>
	    : def extends readonly unknown[]
	      ? validateTuple<def, $, args>
	      : def extends BadDefinitionType
	        ? writeBadDefinitionTypeMessage<objectKindOrDomainOf<def>>
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
	| type.cast<unknown>
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
							? validateInference<def[`${k}?`], defined<declared[k]>, $, args>
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
type Terminal = RegExp | type.cast<unknown> | ((...args: never[]) => unknown)

export type ThunkCast<t = unknown> = () => type.cast<t>

type BadDefinitionType = Exclude<Primitive, string>

export const writeBadDefinitionTypeMessage = <actual extends string>(
	actual: actual
): writeBadDefinitionTypeMessage<actual> =>
	`Type definitions must be strings or objects (was ${actual})`

type writeBadDefinitionTypeMessage<actual extends string> =
	`Type definitions must be strings or objects (was ${actual})`
