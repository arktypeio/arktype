import type {
	ConstraintKind,
	DivisorSchema,
	ExactLengthSchema,
	ExclusiveDateRangeSchema,
	ExclusiveNumericRangeSchema,
	FlatRef,
	InclusiveDateRangeSchema,
	InclusiveNumericRangeSchema,
	InferredRoot,
	LimitSchemaValue,
	PatternSchema,
	TypeIndexer,
	TypeKey,
	UnknownRangeSchema,
	writeInvalidOperandMessage
} from "@ark/schema"
import {
	$ark,
	cached,
	includes,
	omit,
	throwParseError,
	type Callable,
	type ErrorMessage,
	type Json,
	type NonEmptyList,
	type array,
	type conform,
	type typeToString
} from "@ark/util"
import type {
	constrain,
	distillConstrainableIn,
	distillConstrainableOut,
	distillIn,
	distillOut
} from "../ast.js"
import {
	throwInvalidOperandError,
	type PrimitiveConstraintKind
} from "../constraint.js"
import type {
	Node,
	NodeSchema,
	Prerequisite,
	reducibleKindOf
} from "../kinds.js"
import { BaseNode, appendUniqueFlatRefs } from "../node.js"
import type { Predicate } from "../predicate.js"
import type { RootScope } from "../scope.js"
import type { BaseMeta, BaseNodeDeclaration } from "../shared/declare.js"
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
	inferred,
	type internalImplementationOf
} from "../shared/utils.js"
import type {
	StructureInner,
	UndeclaredKeyBehavior,
	arkKeyOf,
	getArkKey
} from "../structure/structure.js"
import type { constraintKindOf } from "./intersection.js"
import type { Morph, MorphNode, inferMorphOut, inferPipes } from "./morph.js"
import type { UnionChildKind, UnionChildNode } from "./union.js"

export interface InternalRootDeclaration extends BaseNodeDeclaration {
	kind: RootKind
}

export type UnknownRoot<t = unknown> = Root<t> | BaseRoot

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
		out d extends InternalRootDeclaration = InternalRootDeclaration
	>
	extends BaseNode<d>
	// don't require intersect so we can make it protected to ensure it is not called internally
	implements internalImplementationOf<Root, TypeOnlyRootKey | "intersect">
{
	[inferred]?: unknown
	readonly branches: readonly Node<UnionChildKind>[] =
		this.hasKind("union") ? this.inner.branches : [this as never]

	readonly [arkKind] = "root"

	get internal(): this {
		return this
	}

	abstract rawKeyOf(): BaseRoot
	abstract get shortDescription(): string

	@cached
	keyof(): BaseRoot {
		const result = this.rawKeyOf()
		if (result.branches.length === 0) {
			throwParseError(
				`keyof ${this.expression} results in an unsatisfiable type`
			)
		}
		return result
	}

	protected intersect(r: unknown): BaseRoot | Disjoint {
		const rNode = this.$.parseRoot(r)
		return intersectNodesRoot(this, rNode, this.$) as never
	}

	isUnknown(): boolean {
		return this.hasKind("intersection") && this.children.length === 0
	}

	isNever(): boolean {
		return this.hasKind("union") && this.children.length === 0
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

	pick(...keys: array<TypeKey>): BaseRoot {
		if (this.hasKind("union"))
			return this.$.schema(this.branches.map(branch => branch.pick(...keys)))

		if (this.hasKind("morph")) {
			return this.$.node("morph", {
				...this.inner,
				in: this.in.pick(...keys)
			})
		}

		if (this.hasKind("intersection")) {
			if (!this.inner.structure) {
				throwParseError(
					writeNonStructuralOperandMessage("Pick", this.expression)
				)
			}

			return this.$.node("intersection", {
				...this.inner,
				structure: this.inner.structure.pick(...keys)
			})
		}

		if (this.isBasis() && this.domain === "object")
			// if it's an object but has no Structure node, return an empty object
			return $ark.intrinsic.object.internal.bindScope(this.$)

		return throwParseError(
			writeNonStructuralOperandMessage("Pick", this.expression)
		)
	}

	get(...path: array<TypeIndexer>): BaseRoot {
		if (path[0] === undefined) return this

		if (this.hasKind("union")) {
			return this.branches.reduce(
				(acc, b) => acc.or(b.get(...path)),
				$ark.intrinsic.never.internal
			)
		}

		const branch = this as {} as UnionChildNode

		return (
			branch.structure?.get(...(path as NonEmptyList<TypeIndexer>)) ??
			throwParseError(
				writeNonStructuralOperandMessage("Index access", this.expression)
			)
		)
	}

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

	overlaps(r: UnknownRoot): boolean {
		const intersection = this.intersect(r as never)
		return !(intersection instanceof Disjoint)
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

	from(input: unknown): unknown {
		// ideally we wouldn't validate here but for now we need to do determine
		// which morphs to apply
		return this.assert(input)
	}

	pipe(...morphs: Morph[]): BaseRoot {
		return morphs.reduce<BaseRoot>((acc, morph) => acc.pipeOnce(morph), this)
	}

	private pipeOnce(morph: Morph): BaseRoot {
		if (hasArkKind(morph, "root")) {
			const result = pipeNodesRoot(this, morph, this.$)
			if (result instanceof Disjoint) return result.throw()
			return result as BaseRoot
		}
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
			in: this,
			morphs: [morph]
		})
	}

	@cached
	get flatMorphs(): array<FlatRef<MorphNode>> {
		return this.flatRefs.reduce<FlatRef<MorphNode>[]>(
			(branches, ref) =>
				appendUniqueFlatRefs(
					branches,
					ref.node.hasKind("union") ?
						ref.node.branches
							.filter(b => b.hasKind("morph"))
							.map(branch => ({
								path: ref.path,
								propString: ref.propString,
								node: branch
							}))
					: ref.node.hasKind("morph") ? (ref as FlatRef<MorphNode>)
					: []
				),
			[]
		)
	}

	narrow(predicate: Predicate): BaseRoot {
		return this.constrainOut("predicate", predicate)
	}

	constrain<kind extends PrimitiveConstraintKind>(
		kind: kind,
		schema: NodeSchema<kind>
	): BaseRoot {
		return this._constrain("in", kind, schema)
	}

	constrainOut<kind extends PrimitiveConstraintKind>(
		kind: kind,
		schema: NodeSchema<kind>
	): BaseRoot {
		return this._constrain("out", kind, schema)
	}

	private _constrain(
		io: "in" | "out",
		kind: PrimitiveConstraintKind,
		schema: any
	): BaseRoot {
		const constraint = this.$.node(kind, schema)
		if (constraint.impliedBasis && !this[io].extends(constraint.impliedBasis)) {
			return throwInvalidOperandError(
				kind,
				constraint.impliedBasis as never,
				this as never
			)
		}

		const partialIntersection = this.$.node("intersection", {
			[kind]: constraint
		})

		const result =
			io === "in" ?
				intersectNodesRoot(this, partialIntersection, this.$)
			:	pipeNodesRoot(this, partialIntersection, this.$)

		if (result instanceof Disjoint) result.throw()

		return result as never
	}

	onUndeclaredKey(cfg: UndeclaredKeyBehavior | UndeclaredKeyConfig): BaseRoot {
		const rule = typeof cfg === "string" ? cfg : cfg.rule
		const deep = typeof cfg === "string" ? false : cfg.deep
		return this.transform(
			(kind, inner) =>
				kind === "structure" ?
					rule === "ignore" ?
						omit(inner as StructureInner, { undeclared: 1 })
					:	{ ...inner, undeclared: rule }
				:	inner,
			deep ? undefined : (
				{ shouldTransform: node => !includes(structuralKinds, node.kind) }
			)
		)
	}

	satisfying(predicate: Predicate): BaseRoot {
		return this.constrain("predicate", predicate)
	}

	divisibleBy(schema: DivisorSchema): BaseRoot {
		return this.constrain("divisor", schema)
	}

	matching(schema: PatternSchema): BaseRoot {
		return this.constrain("pattern", schema)
	}

	atLeast(schema: InclusiveNumericRangeSchema): BaseRoot {
		return this.constrain("min", schema)
	}

	atMost(schema: InclusiveNumericRangeSchema): BaseRoot {
		return this.constrain("max", schema)
	}

	moreThan(schema: ExclusiveNumericRangeSchema): BaseRoot {
		return this.constrain("min", exclusivizeRangeSchema(schema))
	}

	lessThan(schema: ExclusiveNumericRangeSchema): BaseRoot {
		return this.constrain("max", exclusivizeRangeSchema(schema))
	}

	atLeastLength(schema: InclusiveNumericRangeSchema): BaseRoot {
		return this.constrain("minLength", schema)
	}

	atMostLength(schema: InclusiveNumericRangeSchema): BaseRoot {
		return this.constrain("maxLength", schema)
	}

	moreThanLength(schema: ExclusiveNumericRangeSchema): BaseRoot {
		return this.constrain("minLength", exclusivizeRangeSchema(schema))
	}

	lessThanLength(schema: ExclusiveNumericRangeSchema): BaseRoot {
		return this.constrain("maxLength", exclusivizeRangeSchema(schema))
	}

	exactlyLength(schema: ExactLengthSchema): BaseRoot {
		return this.constrain("exactLength", schema)
	}

	atOrAfter(schema: InclusiveDateRangeSchema): BaseRoot {
		return this.constrain("after", schema)
	}

	atOrBefore(schema: InclusiveDateRangeSchema): BaseRoot {
		return this.constrain("before", schema)
	}

	laterThan(schema: ExclusiveDateRangeSchema): BaseRoot {
		return this.constrain("after", exclusivizeRangeSchema(schema))
	}

	earlierThan(schema: ExclusiveDateRangeSchema): BaseRoot {
		return this.constrain("before", exclusivizeRangeSchema(schema))
	}
}

export type UndeclaredKeyConfig = {
	rule: UndeclaredKeyBehavior
	deep?: boolean
}

export const exclusivizeRangeSchema = <schema extends UnknownRangeSchema>(
	schema: schema
): schema =>
	(typeof schema === "object" && !(schema instanceof Date) ?
		{ ...schema, exclusive: true }
	:	{
			rule: schema,
			exclusive: true
		}) as schema

export type exclusivizeRangeSchema<schema extends UnknownRangeSchema> =
	schema extends LimitSchemaValue ? { rule: schema; exclusive: true } : schema

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
	internal: BaseRoot

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
	abstract overlaps(r: never): boolean
	abstract array(): unknown
	abstract pipe(morph: Morph): unknown

	isUnknown(): boolean

	isNever(): boolean

	assert(data: unknown): this["infer"]

	allows(data: unknown): data is this["inferIn"]

	traverse(data: unknown): distillOut<t> | ArkErrors

	configure(configOrDescription: BaseMeta | string): this

	describe(description: string): this

	onUndeclaredKey(behavior: UndeclaredKeyBehavior): this

	from(literal: this["inferIn"]): this["infer"]
}

// this is declared as a class internally so we can ensure all "abstract"
// methods of BaseRoot are overridden, but we end up exporting it as an interface
// to ensure it is not accessed as a runtime value
declare class _Root<t = unknown, $ = any> extends InnerRoot<t, $> {
	$: RootScope<$>;

	get in(): Root<this["tIn"], $>

	get out(): Root<this["tOut"], $>

	keyof(): Root<keyof this["inferIn"], $>

	pick<const key extends arkKeyOf<t> = never>(
		this: validateStructuralOperand<"Pick", this>,
		...keys: array<key | InferredRoot<key>>
	): Root<{ [k in key]: getArkKey<t, k> }, $>

	get<k1 extends arkKeyOf<t>>(
		k1: k1 | InferredRoot<k1>
	): Root<getArkKey<t, k1>, $>
	get<k1 extends arkKeyOf<t>, k2 extends arkKeyOf<getArkKey<t, k1>>>(
		k1: k1 | InferredRoot<k1>,
		k2: k2 | InferredRoot<k2>
	): Root<getArkKey<getArkKey<t, k1>, k2>, $>
	get<
		k1 extends arkKeyOf<t>,
		k2 extends arkKeyOf<getArkKey<t, k1>>,
		k3 extends arkKeyOf<getArkKey<getArkKey<t, k1>, k2>>
	>(
		k1: k1 | InferredRoot<k1>,
		k2: k2 | InferredRoot<k2>,
		k3: k3 | InferredRoot<k3>
	): Root<getArkKey<getArkKey<getArkKey<t, k1>, k2>, k3>, $>

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

	overlaps(r: Root): boolean
}

export const typeOrTermExtends = (t: unknown, base: unknown) =>
	hasArkKind(base, "root") ?
		hasArkKind(t, "root") ? t.extends(base)
		:	base.allows(t)
	: hasArkKind(t, "root") ? t.hasUnit(base)
	: base === t

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

export type validateStructuralOperand<
	name extends StructuralOperationName,
	t extends { inferIn: unknown }
> =
	t["inferIn"] extends object ? t
	:	ErrorMessage<
			writeNonStructuralOperandMessage<name, typeToString<t["inferIn"]>>
		>

export type validateChainedConstraint<
	kind extends ConstraintKind,
	t extends { inferIn: unknown }
> =
	t["inferIn"] extends Prerequisite<kind> ? t
	:	ErrorMessage<writeInvalidOperandMessage<kind, Root<t["inferIn"]>>>

export type StructuralOperationName = "Pick" | "Omit" | "Index access"

export type writeNonStructuralOperandMessage<
	operation extends StructuralOperationName,
	operand extends string
> = `${operation} operand must be an object (was ${operand})`

export const writeNonStructuralOperandMessage = <
	operation extends StructuralOperationName,
	operand extends string
>(
	operation: operation,
	operand: operand
): writeNonStructuralOperandMessage<operation, operand> =>
	`${operation} operand must be an object (was ${operand})`
