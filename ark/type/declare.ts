import type { TypeMeta, UndeclaredKeyBehavior } from "@ark/schema"
import type {
	anyOrNever,
	array,
	Backslash,
	equals,
	ErrorMessage,
	ErrorType,
	optionalKeyOf,
	requiredKeyOf,
	show,
	unset
} from "@ark/util"
import type { distill, Out } from "./attributes.ts"
import type { type } from "./keywords/keywords.ts"
import type {
	inferDefinition,
	TerminalObjectDefinition,
	ThunkCast
} from "./parser/definition.ts"
import type { MetaKey } from "./parser/objectLiteral.ts"
import type { OptionalPropertyDefinition } from "./parser/property.ts"
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
		:	(In: type.infer.In<def, $>) => Out<preinferred>
	:	preinferred

export type DeclareContext = {
	side?: "in" | "out"
}

export type validateDeclared<declared, def, $, ctx extends DeclareContext> =
	def extends type.validate<def, $> ?
		validateInference<def, declared, $, bindThis<def>, ctx>
	:	type.validate<def, $>

type validateInference<def, declared, $, args, ctx extends DeclareContext> =
	def extends TerminalObjectDefinition | ThunkCast | TupleExpression ?
		// {} as a def is handled here since according to TS it extends { " arkInferred"?: t  }.
		keyof def extends never ?
			// special case it to pass through normal object validation
			validateObjectInference<def, declared, $, args, ctx>
		:	validateShallowInference<inferDefinition<def, $, args>, declared, ctx>
	: def extends array ? validateArrayInference<def, declared, $, args, ctx>
	: def extends object ? validateObjectInference<def, declared, $, args, ctx>
	: validateShallowInference<inferDefinition<def, $, args>, declared, ctx>

type validateArrayInference<
	def extends array,
	declared,
	$,
	args,
	ctx extends DeclareContext
> =
	declared extends array ?
		{
			[i in keyof declared]: i extends keyof def ?
				validateInference<def[i], declared[i], $, args, ctx>
			:	declared[i]
		}
	:	show<declarationMismatch<inferDefinition<def, $, args>, declared>>

type validateObjectInference<
	def extends object,
	declared,
	$,
	args,
	ctx extends DeclareContext
> = show<
	([keyof declared & MetaKey] extends [never] ?
		validateDeclaredKeys<def, declared, $, args, ctx>
	:	validateEscapedDeclaredKeys<def, declared, $, args, ctx>) &
		DeclaredObjectSettings
>

type validateDeclaredKeys<
	def extends object,
	declared,
	$,
	args,
	ctx extends DeclareContext
> = {
	[k in requiredKeyOf<declared>]: k extends keyof def ?
		validateInference<def[k], declared[k], $, args, ctx>
	:	declared[k]
} & {
	[k in optionalKeyOf<declared> & string as declaredOptionalKeySuggestion<
		k,
		def
	>]: declaredOptionalValueSuggestion<def, k, declared, $, args, ctx>
}

// a declared key that is also a special key has to be escaped to be a prop.
// checking each key for that costs enough that only a declaration with one pays it
type validateEscapedDeclaredKeys<
	def extends object,
	declared,
	$,
	args,
	ctx extends DeclareContext
> = {
	[k in requiredKeyOf<declared> as declaredKey<k>]: declaredKey<k> extends (
		keyof def
	) ?
		validateInference<def[declaredKey<k>], declared[k], $, args, ctx>
	:	declared[k]
} & {
	// an escaped key can only be optional through its value
	[k in optionalKeyOf<declared> & string as k extends MetaKey ? declaredKey<k>
	:	declaredOptionalKeySuggestion<k, def>]: k extends MetaKey ?
		declaredEscapedOptionalValueSuggestion<def, k, declared, $, args, ctx>
	:	declaredOptionalValueSuggestion<def, k, declared, $, args, ctx>
}

// settings that don't affect inference, so any declared object can have them
type DeclaredObjectSettings = {
	"@"?: TypeMeta.Collapsible
	"+"?: UndeclaredKeyBehavior
}

type declaredKey<k> = k extends MetaKey ? `${Backslash}${k}` : k

type declaredOptionalKeySuggestion<k extends string, def> =
	k extends keyof def ?
		def[k] extends OptionalPropertyDefinition ?
			k
		:	`${k}?`
	:	`${k}?`

type declaredEscapedOptionalValueSuggestion<
	def,
	k extends keyof declared & MetaKey,
	declared,
	$,
	args,
	ctx extends DeclareContext
> =
	def[declaredKey<k> & keyof def] extends OptionalPropertyDefinition ?
		validateInference<
			def[declaredKey<k> & keyof def],
			Required<declared>[k],
			$,
			args,
			ctx
		>
	:	OptionalPropertyDefinition

type declaredOptionalValueSuggestion<
	def,
	k extends keyof declared & string,
	declared,
	$,
	args,
	ctx extends DeclareContext
> =
	k extends keyof def ?
		def[k] extends OptionalPropertyDefinition ?
			// Required<declared>[k] ensures that we can distinguish { foo?: true } from { foo?: true | undefined }
			validateInference<def[k], Required<declared>[k], $, args, ctx>
		:	declared[k]
	: `${k}?` extends keyof def ?
		validateInference<def[`${k}?`], Required<declared>[k], $, args, ctx>
	:	declared[k]

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
