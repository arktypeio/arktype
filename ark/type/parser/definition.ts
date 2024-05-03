import { type BaseRoot, hasArkKind, type string } from "@arktype/schema"
import {
	type Dict,
	type ErrorMessage,
	type Primitive,
	type anyOrNever,
	type array,
	type defined,
	type equals,
	isThunk,
	type isUnknown,
	objectKindOf,
	type objectKindOrDomainOf,
	type optionalKeyOf,
	printable,
	type requiredKeyOf,
	type show,
	throwParseError
} from "@arktype/util"
import type { type } from "../ark.js"
import type { ParseContext } from "../scope.js"
import {
	type inferObjectLiteral,
	parseObjectLiteral,
	type validateObjectLiteral
} from "./objectLiteral.js"
import type { validateString } from "./semantic/validate.js"
import type { BaseCompletions, inferString } from "./string/string.js"
import {
	type TupleExpression,
	type inferTuple,
	parseTuple,
	type validateTuple
} from "./tuple.js"

export const parseObject = (def: object, ctx: ParseContext): BaseRoot => {
	const objectKind = objectKindOf(def)
	switch (objectKind) {
		case undefined:
			if (hasArkKind(def, "root")) return def
			return parseObjectLiteral(def as Dict, ctx)
		case "Array":
			return parseTuple(def as array, ctx)
		case "RegExp":
			return ctx.$.node(
				"intersection",
				{
					domain: "string",
					regex: def as RegExp
				},
				{ prereduced: true }
			)
		case "Function": {
			const resolvedDef = isThunk(def) ? def() : def
			if (hasArkKind(resolvedDef, "root")) return resolvedDef
			return throwParseError(writeBadDefinitionTypeMessage("Function"))
		}
		default:
			return throwParseError(
				writeBadDefinitionTypeMessage(objectKind ?? printable(def))
			)
	}
}

export type inferDefinition<def, $, args> =
	[def] extends [anyOrNever] ? def
	: def extends type.cast<infer t> | ThunkCast<infer t> ? t
	: def extends string ? inferString<def, $, args>
	: def extends array ? inferTuple<def, $, args>
	: def extends RegExp ? string.matching<string>
	: def extends object ? inferObjectLiteral<def, $, args>
	: never

export type validateDefinition<def, $, args> =
	null extends undefined ?
		ErrorMessage<`'strict' or 'strictNullChecks' must be set to true in your tsconfig's 'compilerOptions'`>
	: [def] extends [Terminal] ? def
	: def extends string ? validateString<def, $, args>
	: def extends array ? validateTuple<def, $, args>
	: def extends BadDefinitionType ?
		writeBadDefinitionTypeMessage<objectKindOrDomainOf<def>>
	: isUnknown<def> extends true ?
		// this allows the initial list of autocompletions to be populated when a user writes "type()",
		// before having specified a definition
		BaseCompletions<$, args> | {}
	:	validateObjectLiteral<def, $, args>

export type validateDeclared<declared, def, $, args> =
	def extends validateDefinition<def, $, args> ?
		validateInference<def, declared, $, args>
	:	validateDefinition<def, $, args>

type validateInference<def, declared, $, args> =
	def extends RegExp | type.cast<unknown> | ThunkCast | TupleExpression ?
		validateShallowInference<def, declared, $, args>
	: def extends array ?
		declared extends array ?
			{
				[i in keyof declared]: i extends keyof def ?
					validateInference<def[i], declared[i], $, args>
				:	declared[i]
			}
		:	show<declarationMismatch<def, declared, $, args>>
	: def extends object ?
		show<
			{
				[k in requiredKeyOf<declared>]: k extends keyof def ?
					validateInference<def[k], declared[k], $, args>
				:	declared[k]
			} & {
				[k in optionalKeyOf<declared> & string as `${k}?`]: `${k}?` extends (
					keyof def
				) ?
					validateInference<def[`${k}?`], defined<declared[k]>, $, args>
				:	declared[k]
			}
		>
	:	validateShallowInference<def, declared, $, args>

type validateShallowInference<def, declared, $, args> =
	equals<inferDefinition<def, $, args>, declared> extends true ? def
	:	show<declarationMismatch<def, declared, $, args>>

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
