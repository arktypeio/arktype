import {
	type ArkErrors,
	type BaseMeta,
	type BaseRoot,
	type Disjoint,
	type Morph,
	type NodeDef,
	type Out,
	type Predicate,
	type PrimitiveConstraintKind,
	RawSchema,
	type ambient,
	type constrain,
	type constraintKindOf,
	type distillConstrainableIn,
	type distillConstrainableOut,
	type distillIn,
	type distillOut,
	type includesMorphs,
	type inferIntersection,
	type inferMorphOut,
	type inferNarrow
} from "@arktype/schema"
import type { Constructor, array, conform } from "@arktype/util"
import type { Generic, validateParameterString } from "./generic.js"
import type {
	inferDefinition,
	validateDeclared,
	validateDefinition
} from "./parser/definition.js"
import type { parseGenericParams } from "./parser/generic.js"
import type {
	IndexOneOperator,
	IndexZeroOperator,
	TupleInfixOperator
} from "./parser/tuple.js"
import type { Scope, bindThis } from "./scope.js"

export type TypeParser<$> = {
	// Parse and check the definition, returning either the original input for a
	// valid definition or a string representing an error message.
	<const def>(def: validateTypeRoot<def, $>): Type<inferTypeRoot<def, $>, $>

	// Spread version of a tuple expression
	<const zero, const one, const rest extends array>(
		_0: zero extends IndexZeroOperator ? zero : validateTypeRoot<zero, $>,
		_1: zero extends "keyof" ? validateTypeRoot<one, $>
		: zero extends "instanceof" ? conform<one, Constructor>
		: zero extends "===" ? conform<one, unknown>
		: conform<one, IndexOneOperator>,
		..._2: zero extends "===" ? rest
		: zero extends "instanceof" ? conform<rest, readonly Constructor[]>
		: one extends TupleInfixOperator ?
			one extends ":" ? [Predicate<distillIn<inferTypeRoot<zero, $>>>]
			: one extends "=>" ? [Morph<distillOut<inferTypeRoot<zero, $>>, unknown>]
			: one extends "@" ? [string | BaseMeta]
			: [validateTypeRoot<rest[0], $>]
		:	[]
	): Type<inferTypeRoot<[zero, one, ...rest], $>, $>

	<params extends string, const def>(
		params: `<${validateParameterString<params>}>`,
		def: validateDefinition<
			def,
			$,
			{
				[param in parseGenericParams<params>[number]]: unknown
			}
		>
	): Generic<parseGenericParams<params>, def, $>

	error: typeof ArkErrors
}

export type DeclarationParser<$> = <preinferred>() => {
	// for some reason, making this a const parameter breaks preinferred validation
	type: <def>(
		def: validateDeclared<preinferred, def, $ & ambient, bindThis<def>>
	) => Type<preinferred, $>
}

// this is declared as a class internally so we can ensure all "abstract"
// methods of BaseRoot are overridden, but we end up exporting it as an interface
// to ensure it is not accessed as a runtime value
export declare class $Type<t = unknown, $ = any> extends BaseRoot<t, $> {
	$: Scope<$>;

	get in(): Type<this["tIn"], $>
	get out(): Type<this["tOut"], $>

	intersect<def>(
		def: validateTypeRoot<def, $>
	): Type<inferIntersection<t, inferTypeRoot<def, $>>> | Disjoint

	and<def>(
		def: validateTypeRoot<def, $>
	): Type<inferIntersection<t, inferTypeRoot<def, $>>, $>

	or<def>(def: validateTypeRoot<def, $>): Type<t | inferTypeRoot<def, $>, $>

	array(): Type<t[], $>

	keyof(): Type<keyof this["inferIn"], $>

	morph<morph extends Morph<this["infer"]>>(
		morph: morph
	): Type<(In: distillConstrainableIn<t>) => Out<inferMorphOut<morph>>, $>

	// TODO: based on below, should maybe narrow morph output if used after
	narrow<def extends Predicate<distillConstrainableOut<t>>>(
		def: def
	): Type<
		includesMorphs<t> extends true ?
			(In: distillConstrainableIn<t>) => Out<inferNarrow<this["infer"], def>>
		:	inferNarrow<this["infer"], def>,
		$
	>

	equals<def>(
		def: validateTypeRoot<def, $>
	): this is Type<inferTypeRoot<def>, $>

	// TODO: i/o
	extract<def>(r: validateTypeRoot<def, $>): Type<t, $>
	exclude<def>(r: validateTypeRoot<def, $>): Type<t, $>
	extends<def>(
		other: validateTypeRoot<def, $>
	): this is Type<inferTypeRoot<def>, $>

	pipe<to extends Type>(
		outTransform: (out: this["out"]) => to
	): Type<
		includesMorphs<t> extends true ?
			(In: distillConstrainableIn<t>) => distillConstrainableOut<to["t"]>
		:	distillConstrainableOut<to["t"]>,
		$
	>
	pipe<def>(
		def: validateTypeRoot<def, $>
	): Type<inferIntersection<t, inferTypeRoot<def, $>, true>, $>

	constrain<
		kind extends PrimitiveConstraintKind,
		const def extends NodeDef<kind>
	>(
		kind: conform<kind, constraintKindOf<this["inferIn"]>>,
		def: def
	): Type<constrain<t, kind, def>, $>
}

export interface Type<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out t = unknown,
	$ = any
> extends $Type<t, $> {}

export type TypeConstructor<t = unknown, $ = any> = new (
	def: unknown,
	$: Scope<$>
) => Type<t, $>

export const Type: TypeConstructor = RawSchema as never

export type DefinitionParser<$> = <def>(def: validateTypeRoot<def, $>) => def

export type validateTypeRoot<def, $ = {}> = validateDefinition<
	def,
	$ & ambient,
	bindThis<def>
>

export type inferTypeRoot<def, $ = {}> = inferDefinition<
	def,
	$ & ambient,
	bindThis<def>
>
