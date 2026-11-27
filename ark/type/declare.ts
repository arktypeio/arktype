import type { NodeSelector, TypeMeta, UndeclaredKeyBehavior } from "@ark/schema"
import type {
	anyOrNever,
	array,
	Backslash,
	conform,
	Constructor,
	equals,
	ErrorMessage,
	ErrorType,
	exactEquals,
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
import type {
	isDefaultable,
	OptionalPropertyDefinition
} from "./parser/property.ts"
import type {
	ArgTwoOperator,
	IndexZeroOperator,
	TupleExpression,
	TupleInfixOperator
} from "./parser/tupleExpressions.ts"
import type { bindThis } from "./scope.ts"
import type { Type, ValidatedArgs } from "./type.ts"

export type DeclarationParser<$> = <
	preinferred = unset,
	ctx extends DeclareContext = {}
>() => {
	type: DeclaredTypeParser<preinferred, $, ctx>
}

type missingDeclarationMessage =
	`declare<ExternalType>() requires a generic argument`

export interface DeclaredTypeParser<
	preinferred,
	$,
	ctx extends DeclareContext
> {
	<const def>(
		def: [preinferred] extends [anyOrNever] ?
			validateDeclared<preinferred, def, $, ctx>
		: [preinferred] extends [unset] ? ErrorMessage<missingDeclarationMessage>
		: validateDeclared<preinferred, def, $, ctx>
	): Type<finalizePreinferred<preinferred, def, $, ctx>, $>

	/**
	 * A [tuple expression](https://arktype.io/docs/expressions) spread as
	 * this function's arguments, e.g. `.type("===", "a", "b")`, checked
	 * against the declared type as `.type(["===", "a", "b"])` would be.
	 *
	 * Each argument is validated as it is by `type`'s own signature for the
	 * same form, which a parameter string is not, as `declare` defines a Type
	 * rather than a Generic. The declaration is checked on the first argument
	 * once the whole expression is valid.
	 */
	<const zero, const one, const rest extends array>(
		_0: [preinferred] extends [anyOrNever] ?
			validateDeclaredRoot<preinferred, zero, one, rest, $, ctx>
		: [preinferred] extends [unset] ? ErrorMessage<missingDeclarationMessage>
		: validateDeclaredRoot<preinferred, zero, one, rest, $, ctx>,
		_1: zero extends "keyof" ? type.validate<one, $>
		: zero extends "instanceof" ? conform<one, Constructor>
		: zero extends "===" ? conform<one, unknown>
		: conform<one, ArgTwoOperator>,
		..._2: zero extends "===" ? rest
		: zero extends "instanceof" ? conform<rest, readonly Constructor[]>
		: one extends TupleInfixOperator ?
			one extends ":" ?
				ValidatedArgs<zero, one, rest, $>[zero extends unknown ? "predicateRest"
				:	never]
			: one extends "=>" ?
				ValidatedArgs<zero, one, rest, $>[zero extends unknown ? "morphRest"
				:	never]
			: one extends "@" ? [TypeMeta.MappableInput, NodeSelector?]
			: ValidatedArgs<zero, one, rest, $>[zero extends unknown ? "operandRest"
				:	never]
		:	[]
	): Type<finalizePreinferred<preinferred, [zero, one, ...rest], $, ctx>, $>
}

// the first argument of a tuple expression spread as `.type`'s arguments: as
// `type` validates it, or a mismatch with the declared type once the
// expression as a whole is valid. `mismatch` is a default parameter rather than
// `extends infer mismatch` so TypeScript's `isConstTypeVariable` sees `<const
// zero>` through the conditional constraint instead of pruning it with
// `mismatch = unknown` and widening inline object/array literals in `_0`.
type validateDeclaredRoot<
	preinferred,
	zero,
	one,
	rest extends array,
	$,
	ctx extends DeclareContext,
	mismatch = declaredRootMismatch<preinferred, [zero, one, ...rest], $, ctx>
> =
	[mismatch] extends [never] ?
		zero extends IndexZeroOperator ?
			zero
		:	type.validate<zero, $>
	:	mismatch

type declaredRootMismatch<
	preinferred,
	def extends array,
	$,
	ctx extends DeclareContext
> =
	def extends type.validate<def, $> ?
		validateShallowInference<
			inferDefinition<def, $>,
			preinferred,
			ctx
		> extends infer result ?
			unknown extends result ?
				never
			:	result
		:	never
	:	never

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
	ctx["assignable"] extends true ?
		unknown extends declared ? unknown
		: true extends (
			declared extends unknown ?
				exactEquals<declared, object>
			:	never
		) ?
			unknown
		: Extract<declared, array> extends infer branch extends array ?
			[branch] extends [never] ?
				show<declarationMismatch<inferDefinition<def, $, args>, declared>>
			:	validateAssignableArrayBranch<def, branch, $, args, ctx>
		:	show<declarationMismatch<inferDefinition<def, $, args>, declared>>
	: [declared] extends [never] ?
		show<declarationMismatch<inferDefinition<def, $, args>, declared>>
	: [declared] extends [infer d extends array] ?
		true extends isUnion<d> ?
			validateShallowInference<inferDefinition<def, $, args>, declared, ctx>
		:	validateArrayBranch<def, d, $, args, ctx>
	:	show<declarationMismatch<inferDefinition<def, $, args>, declared>>

type isUnion<t, full = t> =
	t extends unknown ?
		[full] extends [t] ?
			false
		:	true
	:	never

type validateAssignableArrayBranch<
	def extends array,
	branch extends array,
	$,
	args,
	ctx extends DeclareContext
> =
	branch extends unknown ? validateArrayBranch<def, branch, $, args, ctx>
	:	never

type validateArrayBranch<
	def extends array,
	declared extends array,
	$,
	args,
	ctx extends DeclareContext
> =
	"..." extends def[number] ?
		validateArrayShallowInference<inferDefinition<def, $, args>, declared, ctx>
	: number extends declared["length"] ?
		validateArrayShallowInference<inferDefinition<def, $, args>, declared, ctx>
	: ctx["assignable"] extends true ?
		{
			[i in keyof declared]: i extends keyof def ?
				validateAssignableTupleElement<def[i], declared, i, $, args, ctx>
			:	declared[i]
		}
	:	{
			[i in keyof declared]-?: i extends keyof def ?
				validateExactTupleElement<def[i], declared, i, $, args, ctx>
			:	declared[i]
		}

// tuple literals infer mutable arrays, so ignore top-level readonly on variadic
// declared arrays just as the element-wise branch above does for fixed tuples
type validateArrayShallowInference<
	t,
	declared extends array,
	ctx extends DeclareContext,
	inferred = ctx["side"] extends distill.Side ? distill<t, ctx["side"]> : t
> =
	(
		ctx["assignable"] extends true ?
			[inferred] extends [declared] ?
				true
			:	false
		:	equals<inferred, declared extends unknown[] ? declared : [...declared]>
	) extends true ?
		unknown
	:	show<declarationMismatch<inferred, declared>>

type validateAssignableTupleElement<
	elDef,
	declared extends array,
	i extends keyof declared,
	$,
	args,
	ctx extends DeclareContext
> =
	i extends optionalKeyOf<declared> ?
		validateInference<
			elDef,
			| Required<declared>[i]
			| ({ [_ in i]: undefined } extends Pick<declared, i> ? undefined : never),
			$,
			args,
			ctx
		>
	: isDeclaredOptionalValue<elDef, $, args, ctx> extends true ?
		show<
			declarationMismatch<
				inferDefinition<elDef, $, args> | undefined,
				declared[i]
			>
		>
	:	validateInference<elDef, declared[i], $, args, ctx>

type validateExactTupleElement<
	elDef,
	declared extends array,
	i extends keyof declared,
	$,
	args,
	ctx extends DeclareContext
> =
	i extends optionalKeyOf<declared> ?
		isDeclaredOptionalValue<elDef, $, args, ctx> extends true ?
			validateInference<
				elDef,
				declaredOptionalValue<declared, i, elDef, $, args, ctx>,
				$,
				args,
				ctx
			>
		:	OptionalPropertyDefinition
	: isDeclaredOptionalValue<elDef, $, args, ctx> extends true ?
		show<
			declarationMismatch<
				inferDefinition<elDef, $, args> | undefined,
				declared[i]
			>
		>
	:	validateInference<elDef, declared[i], $, args, ctx>

type validateObjectInference<
	def extends object,
	declared,
	$,
	args,
	ctx extends DeclareContext
> =
	ctx["assignable"] extends true ?
		unknown extends declared ? unknown
		: Exclude<Extract<declared, object>, array> extends infer branch ?
			[branch] extends [never] ?
				show<declarationMismatch<inferDefinition<def, $, args>, declared>>
			:	validateAssignableObjectBranch<def, branch, $, args, ctx>
		:	never
	:	show<
			validateObjectKeys<def, declared, $, args, ctx> & DeclaredObjectSettings
		>

type validateAssignableObjectBranch<
	def extends object,
	branch,
	$,
	args,
	ctx extends DeclareContext
> =
	branch extends unknown ?
		exactEquals<branch, object> extends true ?
			unknown
		:	show<
				validateObjectKeys<def, branch, $, args, ctx> & DeclaredObjectSettings
			>
	:	never

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
} & (unknown extends declared[string & keyof declared] ? unknown
	: "[string]" extends keyof def ? unknown
	: ctx["assignable"] extends true ?
		def extends { "+": "reject" | "delete" } ?
			unknown
		:	{ "[string]": declared[string & keyof declared] }
	:	{ "[string]": declared[string & keyof declared] })

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
> = validateRequiredKeys<def, declared, $, args, ctx> &
	(ctx["assignable"] extends true ?
		validateAssignableOptionalKeys<def, declared, $, args, ctx>
	:	{
			[k in optionalKeyOf<declared> & string as declaredOptionalKeySuggestion<
				k,
				def,
				$,
				args,
				ctx
			>]: declaredOptionalValueSuggestion<def, k, declared, $, args, ctx>
		})

type validateRequiredKeys<
	def extends object,
	declared,
	$,
	args,
	ctx extends DeclareContext
> =
	ctx["side"] extends "in" ?
		validateGuardedRequiredKeys<def, declared, $, args, ctx>
	: [Extract<def[keyof def], OptionalPropertyDefinition>] extends [never] ?
		{
			[k in requiredKeyOf<declared>]: k extends keyof def ?
				validateInference<def[k], declared[k], $, args, ctx>
			:	declared[k]
		}
	:	validateGuardedRequiredKeys<def, declared, $, args, ctx>

type validateGuardedRequiredKeys<
	def extends object,
	declared,
	$,
	args,
	ctx extends DeclareContext
> = {
	[k in requiredKeyOf<declared>]: k extends keyof def ?
		isDeclaredOptionalValue<def[k], $, args, ctx> extends true ?
			show<declarationMismatch<declared[k] | undefined, declared[k]>>
		:	validateInference<def[k], declared[k], $, args, ctx>
	:	declared[k]
}

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
		isDeclaredOptionalValue<def[declaredKey<k>], $, args, ctx> extends true ?
			show<declarationMismatch<declared[k] | undefined, declared[k]>>
		:	validateInference<def[declaredKey<k>], declared[k], $, args, ctx>
	:	declared[k]
} & {
	// an escaped key can only be optional through its value
	[k in optionalKeyOf<declared> & string as k extends MetaKey ? declaredKey<k>
	:	declaredOptionalKeySuggestion<k, def, $, args, ctx>]: k extends MetaKey ?
		declaredEscapedOptionalValueSuggestion<def, k, declared, $, args, ctx>
	:	declaredOptionalValueSuggestion<def, k, declared, $, args, ctx>
}

// settings that don't affect inference, so any declared object can have them
type DeclaredObjectSettings = {
	"@"?: TypeMeta.Collapsible
	"+"?: UndeclaredKeyBehavior
}

type declaredKey<k> = k extends MetaKey ? `${Backslash}${k}` : k

type isDeclaredOptionalValue<val, $, args, ctx extends DeclareContext> =
	val extends OptionalPropertyDefinition ? true
	: ctx["side"] extends "in" ? isDefaultable<val, $, args>
	: false

type declaredOptionalKeySuggestion<
	k extends string,
	def,
	$,
	args,
	ctx extends DeclareContext
> =
	k extends keyof def ?
		isDeclaredOptionalValue<def[k], $, args, ctx> extends true ?
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
	isDeclaredOptionalValue<
		def[declaredKey<k> & keyof def],
		$,
		args,
		ctx
	> extends true ?
		validateInference<
			def[declaredKey<k> & keyof def],
			declaredOptionalValue<
				declared,
				k,
				def[declaredKey<k> & keyof def],
				$,
				args,
				ctx
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
		isDeclaredOptionalValue<def[k], $, args, ctx> extends true ?
			validateInference<
				def[k],
				declaredOptionalValue<declared, k, def[k], $, args, ctx>,
				$,
				args,
				ctx
			>
		:	declared[k]
	: `${k}?` extends keyof def ?
		validateInference<
			def[`${k}?`],
			declaredOptionalValue<declared, k, def[`${k}?`], $, args, ctx>,
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
	args,
	ctx extends DeclareContext
> =
	undefined extends (
		ctx["side"] extends distill.Side ?
			distill<inferDefinition<valueDef, $, args>, ctx["side"]>
		:	inferDefinition<valueDef, $, args>
	) ?
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
