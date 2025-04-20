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
import type { type } from "./keywords/keywords.ts"
import type { inferDefinition, ThunkCast } from "./parser/definition.ts"
import type { TupleExpression } from "./parser/tupleExpressions.ts"
import type { bindThis } from "./scope.ts"
import type { Type } from "./type.ts"

export type DeclarationParser<$> = <preinferred = unset>() => {
	type: <const def>(
		def: [preinferred] extends [unset] ?
			[preinferred] extends [anyOrNever] ?
				validateDeclared<preinferred, def, $, bindThis<def>>
			:	ErrorMessage<`declare<ExternalType>() requires a generic argument`>
		:	validateDeclared<preinferred, def, $, bindThis<def>>
	) => Type<preinferred, $>
}

export type validateDeclared<declared, def, $, args> =
	def extends type.validate<def, $, args> ?
		validateInference<def, declared, $, args>
	:	type.validate<def, $, args>

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

type declarationMismatch<def, declared, $, args> = ErrorType<{
	declared: declared
	inferred: inferDefinition<def, $, args>
}>
