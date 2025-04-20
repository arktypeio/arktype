import type {
	anyOrNever,
	array,
	defined,
	equals,
	ErrorMessage,
	ErrorType,
	optionalKeyOf,
	requiredKeyOf,
	show,
	unset
} from "@ark/util"
import type { distill } from "./attributes.ts"
import type { type } from "./keywords/keywords.ts"
import type { inferDefinition, ThunkCast } from "./parser/definition.ts"
import type { TupleExpression } from "./parser/tupleExpressions.ts"
import type { bindThis } from "./scope.ts"
import type { Type } from "./type.ts"

export type DeclarationParser<$> = <
	preinferred = unset,
	ctx extends DeclareContext = {}
>() => {
	type: <const def>(
		def: [preinferred] extends [unset] ?
			[preinferred] extends [anyOrNever] ?
				validateDeclared<preinferred, def, $, ctx>
			:	ErrorMessage<`declare<ExternalType>() requires a generic argument`>
		:	validateDeclared<preinferred, def, $, ctx>
	) => Type<finalizePreinferred<preinferred, def, $, ctx>, $>
}

type finalizePreinferred<preinferred, def, $, ctx extends DeclareContext> =
	ctx["side"] extends distill.Side ?
		ctx["side"] extends "in" ?
			(In: preinferred) => type.infer.Out<def, $>
		:	(In: type.infer.In<def, $>) => preinferred
	:	preinferred

export type DeclareContext = {
	side?: "in" | "out"
}

export type validateDeclared<declared, def, $, ctx extends DeclareContext> =
	def extends type.validate<def, $> ?
		validateInference<def, declared, $, bindThis<def>, ctx>
	:	type.validate<def, $>

type validateInference<def, declared, $, args, ctx extends DeclareContext> =
	def extends RegExp | type.cast<unknown> | ThunkCast | TupleExpression ?
		validateShallowInference<inferDefinition<def, $, args>, declared, ctx>
	: def extends array ?
		declared extends array ?
			{
				[i in keyof declared]: i extends keyof def ?
					validateInference<def[i], declared[i], $, args, ctx>
				:	declared[i]
			}
		:	show<declarationMismatch<inferDefinition<def, $, args>, declared>>
	: def extends object ?
		show<
			{
				[k in requiredKeyOf<declared>]: k extends keyof def ?
					validateInference<def[k], declared[k], $, args, ctx>
				:	declared[k]
			} & {
				[k in optionalKeyOf<declared> & string as `${k}?`]: `${k}?` extends (
					keyof def
				) ?
					validateInference<def[`${k}?`], defined<declared[k]>, $, args, ctx>
				:	declared[k]
			}
		>
	:	validateShallowInference<inferDefinition<def, $, args>, declared, ctx>

type validateShallowInference<
	t,
	declared,
	ctx extends DeclareContext,
	inferred = ctx["side"] extends distill.Side ? distill<t, ctx["side"]> : t
> =
	equals<inferred, declared> extends true ? unknown
	:	show<declarationMismatch<inferred, declared>>

type declarationMismatch<inferred, declared> = ErrorType<{
	declared: declared
	inferred: inferred
}>
