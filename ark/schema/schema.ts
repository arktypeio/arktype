import {
	throwParseError,
	type Callable,
	type Json,
	type conform
} from "@arktype/util"
import type { constrain } from "./constraints/ast.js"
import type { Predicate } from "./constraints/predicate.js"
import {
	throwInvalidOperandError,
	type PrimitiveConstraintKind
} from "./constraints/util.js"
import type { NodeDef, reducibleKindOf } from "./kinds.js"
import { RawNode, type Node } from "./node.js"
import type { constraintKindOf } from "./schemas/intersection.js"
import type {
	Morph,
	distillConstrainableIn,
	distillConstrainableOut,
	distillIn,
	distillOut,
	inferMorphOut,
	inferPipes
} from "./schemas/morph.js"
import type { UnionChildKind } from "./schemas/union.js"
import type { SchemaScope } from "./scope.js"
import type { BaseMeta, RawNodeDeclaration } from "./shared/declare.js"
import { Disjoint } from "./shared/disjoint.js"
import { ArkErrors } from "./shared/errors.js"
import type { NodeKind, SchemaKind, kindRightOf } from "./shared/implement.js"
import {
	intersectNodesRoot,
	pipeNodesRoot,
	type inferIntersection
} from "./shared/intersections.js"
import {
	arkKind,
	hasArkKind,
	type inferred,
	type internalImplementationOf
} from "./shared/utils.js"

export interface RawSchemaDeclaration extends RawNodeDeclaration {
	kind: SchemaKind
}

export type UnknownSchema = Schema | RawSchema

export type TypeOnlySchemaKey =
	| (keyof Schema & symbol)
	| "infer"
	| "inferIn"
	| "t"
	| "tIn"
	| "tOut"

export abstract class RawSchema<
		/** uses -ignore rather than -expect-error because this is not an error in .d.ts
		 * @ts-ignore allow instantiation assignment to the base type */
		out d extends RawSchemaDeclaration = RawSchemaDeclaration
	>
	extends RawNode<d>
	implements internalImplementationOf<Schema, TypeOnlySchemaKey>
{
	readonly branches: readonly Node<UnionChildKind>[] =
		this.hasKind("union") ? this.inner.branches : [this as never];

	readonly [arkKind] = "schema"

	get raw(): this {
		return this
	}

	abstract rawKeyOf(): RawSchema

	private _keyof: RawSchema | undefined
	keyof(): RawSchema {
		if (!this._keyof) {
			this._keyof = this.rawKeyOf()
			if (this._keyof.branches.length === 0) {
				throwParseError(
					`keyof ${this.expression} results in an unsatisfiable type`
				)
			}
		}
		return this._keyof as never
	}

	// TODO: can it be enforced that this is not called internally and instead intersectNodes is used?
	intersect(r: unknown): RawSchema | Disjoint {
		const rNode = this.$.parseRoot(r)
		return intersectNodesRoot(this, rNode, this.$) as never
	}

	and(r: unknown): RawSchema {
		const result = this.intersect(r)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	or(r: unknown): RawSchema {
		const rNode = this.$.parseRoot(r)
		const branches = [...this.branches, ...(rNode.branches as any)]
		return this.$.schema(branches) as never
	}

	assert(data: unknown): unknown {
		const result = this.traverse(data)
		return result instanceof ArkErrors ? result.throw() : result
	}

	// get<key extends PropertyKey>(
	// 	...path: readonly (key | Schema<key>)[]
	// ): this {
	// 	return this
	// }

	extract(r: unknown): RawSchema {
		const rNode = this.$.parseRoot(r)
		return this.$.schema(
			this.branches.filter(branch => branch.extends(rNode))
		) as never
	}

	exclude(r: UnknownSchema): RawSchema {
		const rNode = this.$.parseRoot(r)
		return this.$.schema(
			this.branches.filter(branch => !branch.extends(rNode))
		) as never
	}

	array(): RawSchema {
		return this.$.schema(
			{
				proto: Array,
				sequence: this
			},
			{ prereduced: true }
		) as never
	}

	extends(r: UnknownSchema): boolean {
		const intersection = this.intersect(r as never)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}

	subsumes(r: UnknownSchema): boolean {
		return r.extends(this as never)
	}

	configure(configOrDescription: BaseMeta | string): this {
		return this.configureShallowDescendants(configOrDescription)
	}

	describe(description: string): this {
		return this.configure(description)
	}

	create(input: unknown): unknown {
		// ideally we wouldn't validate here but for now we need to do determine
		// which morphs to apply
		return this.assert(input)
	}

	pipe(...morphs: Morph[]): RawSchema {
		return morphs.reduce<RawSchema>((acc, morph) => acc.pipeOnce(morph), this)
	}

	private pipeOnce(morph: Morph): RawSchema {
		if (hasArkKind(morph, "schema"))
			return pipeNodesRoot(this, morph, this.$) as never
		if (this.hasKind("union")) {
			const branches = this.branches.map(node => node.pipe(morph))
			return this.$.node("union", { ...this.inner, branches })
		}
		if (this.hasKind("morph")) {
			return this.$.node("morph", {
				...this.inner,
				morphs: [...this.morphs, morph]
			})
		}
		return this.$.node("morph", {
			from: this,
			morphs: [morph]
		})
	}

	narrow(predicate: Predicate): RawSchema {
		return this.constrain("predicate", predicate)
	}

	constrain<kind extends PrimitiveConstraintKind>(
		kind: kind,
		def: NodeDef<kind>
	): RawSchema {
		const constraint = this.$.node(kind, def)
		if (constraint.impliedBasis && !this.extends(constraint.impliedBasis)) {
			return throwInvalidOperandError(
				kind,
				constraint.impliedBasis as never,
				this as never
			)
		}

		return this.and(
			// TODO: not an intersection
			this.$.node("intersection", {
				[kind]: constraint
			})
		)
	}

	// divisibleBy<
	// 	const schema extends validateConstraintArg<"divisor", this["infer"]>
	// >(schema: schema): Type<applySchema<t, "divisor", schema>, $> {
	// 	return this.rawConstrain("divisor", schema as never) as never
	// }

	// atLeast<const schema extends validateConstraintArg<"min", this["infer"]>>(
	// 	schema: schema
	// ): Type<applySchema<t, "min", schema>, $> {
	// 	return this.rawConstrain("min", schema as never) as never
	// }

	// atMost<const schema extends validateConstraintArg<"max", this["infer"]>>(
	// 	schema: schema
	// ): Type<applySchema<t, "max", schema>, $> {
	// 	return this.rawConstrain("max", schema as never) as never
	// }

	// moreThan<const schema extends validateConstraintArg<"min", this["infer"]>>(
	// 	schema: schema
	// ): Type<applySchema<t, "min", schema>, $> {
	// 	return this.rawConstrain("min", schema as never) as never
	// }

	// lessThan<const schema extends validateConstraintArg<"max", this["infer"]>>(
	// 	schema: schema
	// ): Type<applySchema<t, "max", schema>, $> {
	// 	return this.rawConstrain("max", schema as never) as never
	// }

	// atLeastLength<
	// 	const schema extends validateConstraintArg<"minLength", this["infer"]>
	// >(schema: schema): Type<applySchema<t, "minLength", schema>, $> {
	// 	return this.rawConstrain("minLength", schema as never) as never
	// }

	// atMostLength<
	// 	const schema extends validateConstraintArg<"maxLength", this["infer"]>
	// >(schema: schema): Type<applySchema<t, "maxLength", schema>, $> {
	// 	return this.rawConstrain("maxLength", schema as never) as never
	// }

	// earlierThan<
	// 	const schema extends validateConstraintArg<"before", this["infer"]>
	// >(schema: schema): Type<applySchema<t, "before", schema>, $> {
	// 	return this.rawConstrain("before", schema as never) as never
	// }

	// laterThan<const schema extends validateConstraintArg<"after", this["infer"]>>(
	// 	schema: schema
	// ): Type<applySchema<t, "after", schema>, $> {
	// 	return this.rawConstrain("after", schema as never) as never
	// }
}

export declare abstract class BaseRoot<t = unknown, $ = any> extends Callable<
	(data: unknown) => distillOut<t> | ArkErrors
> {
	t: t
	tIn: distillConstrainableIn<t>
	tOut: distillConstrainableOut<t>
	infer: distillOut<t>
	inferIn: distillIn<t>;
	[inferred]: t

	json: Json
	description: string
	expression: string
	raw: RawSchema

	abstract $: SchemaScope<$>;
	abstract get in(): unknown
	abstract get out(): unknown
	abstract keyof(): unknown
	abstract intersect(r: never): unknown | Disjoint
	abstract and(r: never): unknown
	abstract or(r: never): unknown
	abstract constrain(kind: never, def: never): unknown
	abstract equals(r: never): this is unknown
	abstract extract(r: never): unknown
	abstract exclude(r: never): unknown
	abstract extends(r: never): this is unknown
	abstract array(): unknown
	abstract pipe(morph: Morph): unknown

	assert(data: unknown): this["infer"]

	allows(data: unknown): data is this["inferIn"]

	traverse(data: unknown): distillOut<t> | ArkErrors

	configure(configOrDescription: BaseMeta | string): this

	describe(description: string): this

	create(literal: this["inferIn"]): this["infer"]
}

// this is declared as a class internally so we can ensure all "abstract"
// methods of BaseRoot are overridden, but we end up exporting it as an interface
// to ensure it is not accessed as a runtime value
declare class _Schema<t = unknown, $ = any> extends BaseRoot<t, $> {
	$: SchemaScope<$>;

	get in(): Schema<this["tIn"], $>

	get out(): Schema<this["tOut"], $>

	keyof(): Schema<keyof this["inferIn"], $>

	intersect<r extends Schema>(
		r: r
	): Schema<inferIntersection<t, r["t"]>> | Disjoint

	and<r extends Schema>(r: r): Schema<inferIntersection<t, r["t"]>>

	or<r extends Schema>(r: r): Schema<t | r["t"]>

	array(): Schema<t[], $>

	constrain<
		kind extends PrimitiveConstraintKind,
		const def extends NodeDef<kind>
	>(
		kind: conform<kind, constraintKindOf<this["inferIn"]>>,
		def: def
	): Schema<constrain<t, kind, def>, $>

	equals<r>(r: Schema<r>): this is Schema<r>

	// TODO: i/o
	extract<r>(r: Schema<r>): Schema<t, $>
	exclude<r>(r: Schema<r>): Schema<t, $>

	// add the extra inferred intersection so that a variable of Type
	// can be narrowed without other branches becoming never
	extends<r>(other: Schema<r>): this is Schema<r> & { [inferred]?: r }

	pipe<a extends Morph<this["infer"]>>(a: a): Schema<inferPipes<t, [a]>, $>
	pipe<a extends Morph<this["infer"]>, b extends Morph<inferMorphOut<a>>>(
		a: a,
		b: b
	): Schema<inferPipes<t, [a, b]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>
	>(a: a, b: b, c: c): Schema<inferPipes<t, [a, b, c]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>
	>(a: a, b: b, c: c, d: d): Schema<inferPipes<t, [a, b, c, d]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>
	>(a: a, b: b, c: c, d: d, e: e): Schema<inferPipes<t, [a, b, c, d, e]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f
	): Schema<inferPipes<t, [a, b, c, d, e, f]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g
	): Schema<inferPipes<t, [a, b, c, d, e, f, g]>, $>
}

export interface Schema<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out t = unknown,
	$ = any
> extends _Schema<t, $> {}

export type intersectSchema<l extends SchemaKind, r extends NodeKind> =
	[l, r] extends [r, l] ? l
	:	asymmetricIntersectionOf<l, r> | asymmetricIntersectionOf<r, l>

type asymmetricIntersectionOf<l extends NodeKind, r extends NodeKind> =
	l extends unknown ?
		r extends kindRightOf<l> ?
			l | reducibleKindOf<l>
		:	never
	:	never

export type schemaKindRightOf<kind extends SchemaKind> = Extract<
	kindRightOf<kind>,
	SchemaKind
>

export type schemaKindOrRightOf<kind extends SchemaKind> =
	| kind
	| schemaKindRightOf<kind>
