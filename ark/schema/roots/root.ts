import {
	includes,
	omit,
	throwParseError,
	type Callable,
	type Json,
	type conform
} from "@arktype/util"
import type { constrain } from "../ast.js"
import {
	throwInvalidOperandError,
	type PrimitiveConstraintKind
} from "../constraint.js"
import type { Node, NodeSchema, reducibleKindOf } from "../kinds.js"
import { BaseNode } from "../node.js"
import type { Predicate } from "../predicate.js"
import type { RootScope } from "../scope.js"
import type { BaseMeta, RawNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { ArkErrors } from "../shared/errors.js"
import {
	structuralKinds,
	type NodeKind,
	type RootKind,
	type kindRightOf
} from "../shared/implement.js"
import {
	intersectNodesRoot,
	pipeNodesRoot,
	type inferIntersection
} from "../shared/intersections.js"
import {
	arkKind,
	hasArkKind,
	type inferred,
	type internalImplementationOf
} from "../shared/utils.js"
import type {
	StructureInner,
	UndeclaredKeyBehavior
} from "../structure/structure.js"
import type { constraintKindOf } from "./intersection.js"
import type {
	Morph,
	distillConstrainableIn,
	distillConstrainableOut,
	distillIn,
	distillOut,
	inferMorphOut,
	inferPipes
} from "./morph.js"
import type { UnionChildKind } from "./union.js"

export interface RawRootDeclaration extends RawNodeDeclaration {
	kind: RootKind
}

export type UnknownRoot = Root | BaseRoot

export type TypeOnlyRootKey =
	| (keyof Root & symbol)
	| "infer"
	| "inferIn"
	| "t"
	| "tIn"
	| "tOut"

export abstract class BaseRoot<
		/** uses -ignore rather than -expect-error because this is not an error in .d.ts
		 * @ts-ignore allow instantiation assignment to the base type */
		out d extends RawRootDeclaration = RawRootDeclaration
	>
	extends BaseNode<d>
	// don't require intersect so we can make it protected to ensure it is not called internally
	implements internalImplementationOf<Root, TypeOnlyRootKey | "intersect">
{
	readonly branches: readonly Node<UnionChildKind>[] =
		this.hasKind("union") ? this.inner.branches : [this as never];

	readonly [arkKind] = "root"

	get raw(): this {
		return this
	}

	abstract rawKeyOf(): BaseRoot

	private _keyof: BaseRoot | undefined
	keyof(): BaseRoot {
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

	protected intersect(r: unknown): BaseRoot | Disjoint {
		const rNode = this.$.parseRoot(r)
		return intersectNodesRoot(this, rNode, this.$) as never
	}

	and(r: unknown): BaseRoot {
		const result = this.intersect(r)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	or(r: unknown): BaseRoot {
		const rNode = this.$.parseRoot(r)
		const branches = [...this.branches, ...(rNode.branches as any)]
		return this.$.schema(branches) as never
	}

	assert(data: unknown): unknown {
		const result = this.traverse(data)
		return result instanceof ArkErrors ? result.throw() : result
	}

	// get<key extends PropertyKey>(
	// 	...path: readonly (key | Root<key>)[]
	// ): this {
	// 	return this
	// }

	extract(r: unknown): BaseRoot {
		const rNode = this.$.parseRoot(r)
		return this.$.schema(
			this.branches.filter(branch => branch.extends(rNode))
		) as never
	}

	exclude(r: UnknownRoot): BaseRoot {
		const rNode = this.$.parseRoot(r)
		return this.$.schema(
			this.branches.filter(branch => !branch.extends(rNode))
		) as never
	}

	array(): BaseRoot {
		return this.$.schema(
			{
				proto: Array,
				sequence: this
			},
			{ prereduced: true }
		) as never
	}

	extends(r: UnknownRoot): boolean {
		const intersection = this.intersect(r as never)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}

	subsumes(r: UnknownRoot): boolean {
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

	pipe(...morphs: Morph[]): BaseRoot {
		return morphs.reduce<BaseRoot>((acc, morph) => acc.pipeOnce(morph), this)
	}

	private pipeOnce(morph: Morph): BaseRoot {
		if (hasArkKind(morph, "root"))
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

	narrow(predicate: Predicate): BaseRoot {
		return this.constrain("predicate", predicate)
	}

	constrain<kind extends PrimitiveConstraintKind>(
		kind: kind,
		schema: NodeSchema<kind>
	): BaseRoot {
		const constraint = this.$.node(kind, schema)
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

	onUndeclaredKey(undeclared: UndeclaredKeyBehavior): BaseRoot {
		return this.transform(
			(kind, inner) =>
				kind === "structure" ?
					undeclared === "ignore" ?
						omit(inner as StructureInner, { undeclared: 1 })
					:	{ ...inner, undeclared }
				:	inner,
			node => !includes(structuralKinds, node.kind)
		)
	}

	// divisibleBy<
	// 	const schema extends validateConstraintArg<"divisor", this["infer"]>
	// >(schema: schema): Type<applyRoot<t, "divisor", schema>, $> {
	// 	return this.rawConstrain("divisor", schema as never) as never
	// }

	// atLeast<const schema extends validateConstraintArg<"min", this["infer"]>>(
	// 	schema: schema
	// ): Type<applyRoot<t, "min", schema>, $> {
	// 	return this.rawConstrain("min", schema as never) as never
	// }

	// atMost<const schema extends validateConstraintArg<"max", this["infer"]>>(
	// 	schema: schema
	// ): Type<applyRoot<t, "max", schema>, $> {
	// 	return this.rawConstrain("max", schema as never) as never
	// }

	// moreThan<const schema extends validateConstraintArg<"min", this["infer"]>>(
	// 	schema: schema
	// ): Type<applyRoot<t, "min", schema>, $> {
	// 	return this.rawConstrain("min", schema as never) as never
	// }

	// lessThan<const schema extends validateConstraintArg<"max", this["infer"]>>(
	// 	schema: schema
	// ): Type<applyRoot<t, "max", schema>, $> {
	// 	return this.rawConstrain("max", schema as never) as never
	// }

	// atLeastLength<
	// 	const schema extends validateConstraintArg<"minLength", this["infer"]>
	// >(schema: schema): Type<applyRoot<t, "minLength", schema>, $> {
	// 	return this.rawConstrain("minLength", schema as never) as never
	// }

	// atMostLength<
	// 	const schema extends validateConstraintArg<"maxLength", this["infer"]>
	// >(schema: schema): Type<applyRoot<t, "maxLength", schema>, $> {
	// 	return this.rawConstrain("maxLength", schema as never) as never
	// }

	// earlierThan<
	// 	const schema extends validateConstraintArg<"before", this["infer"]>
	// >(schema: schema): Type<applyRoot<t, "before", schema>, $> {
	// 	return this.rawConstrain("before", schema as never) as never
	// }

	// laterThan<const schema extends validateConstraintArg<"after", this["infer"]>>(
	// 	schema: schema
	// ): Type<applyRoot<t, "after", schema>, $> {
	// 	return this.rawConstrain("after", schema as never) as never
	// }
}

export declare abstract class InnerRoot<t = unknown, $ = any> extends Callable<
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
	raw: BaseRoot

	abstract $: RootScope<$>;
	abstract get in(): unknown
	abstract get out(): unknown
	abstract keyof(): unknown
	abstract intersect(r: never): unknown | Disjoint
	abstract and(r: never): unknown
	abstract or(r: never): unknown
	abstract constrain(kind: never, schema: never): unknown
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

	onUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	create(literal: this["inferIn"]): this["infer"]
}

// this is declared as a class internally so we can ensure all "abstract"
// methods of BaseRoot are overridden, but we end up exporting it as an interface
// to ensure it is not accessed as a runtime value
declare class _Root<t = unknown, $ = any> extends InnerRoot<t, $> {
	$: RootScope<$>;

	get in(): Root<this["tIn"], $>

	get out(): Root<this["tOut"], $>

	keyof(): Root<keyof this["inferIn"], $>

	intersect<r extends Root>(r: r): Root<inferIntersection<t, r["t"]>> | Disjoint

	and<r extends Root>(r: r): Root<inferIntersection<t, r["t"]>>

	or<r extends Root>(r: r): Root<t | r["t"]>

	array(): Root<t[], $>

	constrain<
		kind extends PrimitiveConstraintKind,
		const schema extends NodeSchema<kind>
	>(
		kind: conform<kind, constraintKindOf<this["inferIn"]>>,
		schema: schema
	): Root<constrain<t, kind, schema>, $>

	equals<r>(r: Root<r>): this is Root<r>

	// TODO: i/o
	extract<r>(r: Root<r>): Root<t, $>
	exclude<r>(r: Root<r>): Root<t, $>

	// add the extra inferred intersection so that a variable of Type
	// can be narrowed without other branches becoming never
	extends<r>(other: Root<r>): this is Root<r> & { [inferred]?: r }

	pipe<a extends Morph<this["infer"]>>(a: a): Root<inferPipes<t, [a]>, $>
	pipe<a extends Morph<this["infer"]>, b extends Morph<inferMorphOut<a>>>(
		a: a,
		b: b
	): Root<inferPipes<t, [a, b]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>
	>(a: a, b: b, c: c): Root<inferPipes<t, [a, b, c]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>
	>(a: a, b: b, c: c, d: d): Root<inferPipes<t, [a, b, c, d]>, $>
	pipe<
		a extends Morph<this["infer"]>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>
	>(a: a, b: b, c: c, d: d, e: e): Root<inferPipes<t, [a, b, c, d, e]>, $>
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
	): Root<inferPipes<t, [a, b, c, d, e, f]>, $>
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
	): Root<inferPipes<t, [a, b, c, d, e, f, g]>, $>
}

export interface Root<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out t = unknown,
	$ = any
> extends _Root<t, $> {}

export type intersectRoot<l extends RootKind, r extends NodeKind> =
	[l, r] extends [r, l] ? l
	:	asymmetricIntersectionOf<l, r> | asymmetricIntersectionOf<r, l>

type asymmetricIntersectionOf<l extends NodeKind, r extends NodeKind> =
	l extends unknown ?
		r extends kindRightOf<l> ?
			l | reducibleKindOf<l>
		:	never
	:	never

export type schemaKindRightOf<kind extends RootKind> = Extract<
	kindRightOf<kind>,
	RootKind
>

export type schemaKindOrRightOf<kind extends RootKind> =
	| kind
	| schemaKindRightOf<kind>
