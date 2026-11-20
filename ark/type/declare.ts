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
		def: [preinferred] extends [anyOrNever] ?
			validateDeclared<preinferred, def, $, ctx>
		: [preinferred] extends [unset] ?
			ErrorMessage<`declare<ExternalType>() requires a generic argument`>
		:	validateDeclared<preinferred, def, $, ctx>
	) => Type<finalizePreinferred<preinferred, def, $, ctx>, $>
}

type finalizePreinferred<preinferred, def, $, ctx extends DeclareContext> =
	// an assignable declaration keeps what its definition infers, which may be
	// narrower than what it declares
	ctx["assignable"] extends true ? inferDefinition<def, $>
	: ctx["side"] extends distill.Side ?
		ctx["side"] extends "in" ?
			(In: preinferred) => Out<type.infer.Out<def, $>>
		:	(In: type.infer.In<def, $>) => Out<preinferred>
	:	preinferred

export type DeclareContext = {
	side?: "in" | "out"
	/**
	 * Check that the definition is assignable to the declared type, rather
	 * than equal to it, and keep the type the definition infers.
	 *
	 * A required key may be required or optional where it's declared optional,
	 * an optional key may be left out, and each value may be narrower than
	 * the one declared. A key the declared type doesn't name is still an error.
	 */
	assignable?: boolean
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
	declaredObjectOf<declared, ctx> extends infer declared extends array ?
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
	validateObjectKeys<def, declaredObjectOf<declared, ctx>, $, args, ctx> &
		DeclaredObjectSettings
>

// an object is assignable to `T | undefined` exactly where it is to `T`
type declaredObjectOf<declared, ctx extends DeclareContext> =
	ctx["assignable"] extends true ? Exclude<declared, null | undefined>
	:	declared

type validateObjectKeys<
	def extends object,
	declared,
	$,
	args,
	ctx extends DeclareContext
> =
	string extends keyof declared ?
		validateIndexedDeclaredKeys<def, declared, $, args, ctx>
	: [keyof declared & MetaKey] extends [never] ?
		validateDeclaredKeys<def, declared, $, args, ctx>
	:	validateEscapedDeclaredKeys<def, declared, $, args, ctx>

// e.g. `Omit<{ a: string } & Record<string, unknown>, "b">`, which keeps only
// `[k: string]: unknown`. Mapped over `keyof`, the index signature would take
// every key the definition has as `unknown` and give the Type that, so each
// key is checked against the declared key it falls under instead
type validateIndexedDeclaredKeys<
	def extends object,
	declared,
	$,
	args,
	ctx extends DeclareContext,
	literalKey extends keyof declared = literalKeyOf<declared>
> = ([literalKey] extends [never] ? unknown
:	validateObjectKeys<def, Pick<declared, literalKey>, $, args, ctx>) & {
	[k in Exclude<
		keyof def,
		literalKey | `${literalKey & string}?` | MetaKey
	>]: validateInference<def[k], declared[string & keyof declared], $, args, ctx>
}

type literalKeyOf<o> = keyof {
	[k in keyof o as string extends k ? never
	: number extends k ? never
	: symbol extends k ? never
	: k]: 0
}

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
} & (ctx["assignable"] extends true ?
	validateAssignableOptionalKeys<def, declared, $, args, ctx>
:	{
		[k in optionalKeyOf<declared> & string as declaredOptionalKeySuggestion<
			k,
			def
		>]: declaredOptionalValueSuggestion<def, k, declared, $, args, ctx>
	})

// a key declared optional may be left out, or written required or optional,
// and either way its value may be narrower than the one declared
type validateAssignableOptionalKeys<
	def extends object,
	declared,
	$,
	args,
	ctx extends DeclareContext
> = {
	[k in optionalKeyOf<declared> & string as k extends keyof def ? k
	: `${k}?` extends keyof def ? `${k}?`
	: k | `${k}?`]?: (
		k extends keyof def ? k
		: `${k}?` extends keyof def ? `${k}?`
		: never
	) extends infer defKey extends keyof def ?
		[defKey] extends [never] ?
			declared[k]
		:	validateInference<
				def[defKey],
				// `undefined` too, unless `exactOptionalPropertyTypes` keeps it out.
				// written inline so a mismatch shows the type rather than an alias
				| Required<declared>[k]
				| ({ [_ in k]: undefined } extends Pick<declared, k> ? undefined
				  :	never),
				$,
				args,
				ctx
			>
	:	never
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
			declaredOptionalValue<
				declared,
				k,
				def[declaredKey<k> & keyof def],
				$,
				args
			>,
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
			validateInference<
				def[k],
				declaredOptionalValue<declared, k, def[k], $, args>,
				$,
				args,
				ctx
			>
		:	declared[k]
	: `${k}?` extends keyof def ?
		validateInference<
			def[`${k}?`],
			declaredOptionalValue<declared, k, def[`${k}?`], $, args>,
			$,
			args,
			ctx
		>
	:	declared[k]

// Required<declared>[k] distinguishes { foo?: true } from { foo?: true | undefined }.
// Without exactOptionalPropertyTypes, TS reads both as the second, and drops
// undefined from both with Required, so a definition allowing undefined is
// checked against the key with it wherever the key allows it
type declaredOptionalValue<
	declared,
	k extends keyof declared,
	valueDef,
	$,
	args
> =
	undefined extends inferDefinition<valueDef, $, args> ?
		{ [_ in k]: undefined } extends Pick<declared, k> ?
			declared[k]
		:	Required<declared>[k]
	:	Required<declared>[k]

type validateShallowInference<
	t,
	declared,
	ctx extends DeclareContext,
	inferred = ctx["side"] extends distill.Side ? distill<t, ctx["side"]> : t
> =
	(
		ctx["assignable"] extends true ?
			[inferred] extends [declared] ?
				true
			:	false
		: isAny<declared> extends true ?
			// only `unknown` is as wide as `any`, so anything narrower would
			// be widened to it
			unknown extends inferred ?
				true
			:	false
		:	equals<inferred, declared>
	) extends true ?
		unknown
	:	show<declarationMismatch<inferred, declared>>

type isAny<t> = 0 extends 1 & t ? true : false

type declarationMismatch<inferred, declared> = ErrorType<{
	declared: declared
	inferred: inferred
}>
