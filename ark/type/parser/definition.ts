import { type Schema, hasArkKind, node, type string } from "@arktype/schema"
import {
	type Dict,
	type ErrorMessage,
	type Primitive,
	type array,
	type defined,
	type equals,
	type evaluate,
	type isAny,
	isThunk,
	type isUnknown,
	objectKindOf,
	type objectKindOrDomainOf,
	type optionalKeyOf,
	printable,
	type requiredKeyOf,
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

export const parseObject = (def: object, ctx: ParseContext): Schema => {
	const objectKind = objectKindOf(def)
	switch (objectKind) {
		case undefined:
			if (hasArkKind(def, "schema")) return def
			return parseObjectLiteral(def as Dict, ctx)
		case "Array":
			return parseTuple(def as array, ctx)
		case "RegExp":
			return node(
				"intersection",
				{
					domain: "string",
					regex: def as RegExp
				},
				{ prereduced: true }
			)
		case "Function": {
			const resolvedDef = isThunk(def) ? def() : def
			if (hasArkKind(resolvedDef, "schema")) return resolvedDef
			return throwParseError(writeBadDefinitionTypeMessage("Function"))
		}
		default:
			return throwParseError(
				writeBadDefinitionTypeMessage(objectKind ?? printable(def))
			)
	}
}

export type inferDefinition<def, $> = isAny<def> extends true
	? never
	: def extends type.cast<infer t> | ThunkCast<infer t>
		? t
		: def extends string
			? inferString<def, $>
			: def extends array
				? inferTuple<def, $>
				: def extends RegExp
					? string.matching<string>
					: def extends object
						? inferObjectLiteral<def, $>
						: never

export type validateDefinition<def, $> = null extends undefined
	? ErrorMessage<`'strict' or 'strictNullChecks' must be set to true in your tsconfig's 'compilerOptions'`>
	: [def] extends [Terminal]
		? def
		: def extends string
			? validateString<def, $>
			: def extends array
				? validateTuple<def, $>
				: def extends BadDefinitionType
					? writeBadDefinitionTypeMessage<objectKindOrDomainOf<def>>
					: isUnknown<def> extends true
						? // this allows the initial list of autocompletions to be populated when a user writes "type()",
							// before having specified a definition
							BaseCompletions<$> | {}
						: validateObjectLiteral<def, $>

export type validateDeclared<declared, def, $> = def extends validateDefinition<
	def,
	$
>
	? validateInference<def, declared, $>
	: validateDefinition<def, $>

type validateInference<def, declared, $> = def extends
	| RegExp
	| type.cast<unknown>
	| ThunkCast
	| TupleExpression
	? validateShallowInference<def, declared, $>
	: def extends array
		? declared extends array
			? {
					[i in keyof declared]: i extends keyof def
						? validateInference<def[i], declared[i], $>
						: unknown
				}
			: evaluate<declarationMismatch<def, declared, $>>
		: def extends object
			? evaluate<
					{
						[k in requiredKeyOf<declared>]: k extends keyof def
							? validateInference<def[k], declared[k], $>
							: unknown
					} & {
						[k in optionalKeyOf<declared> &
							string as `${k}?`]: `${k}?` extends keyof def
							? validateInference<
									def[`${k}?`],
									defined<declared[k]>,
									$
								>
							: unknown
					}
				>
			: validateShallowInference<def, declared, $>

type validateShallowInference<def, declared, $> = equals<
	inferDefinition<def, $>,
	declared
> extends true
	? def
	: evaluate<declarationMismatch<def, declared, $>>

type declarationMismatch<def, declared, $> = {
	declared: declared
	inferred: inferDefinition<def, $>
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
