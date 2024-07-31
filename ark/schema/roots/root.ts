import {
	$ark,
	cached,
	includes,
	omit,
	throwParseError,
	type NonEmptyList,
	type array
} from "@ark/util"
import {
	throwInvalidOperandError,
	type PrimitiveConstraintKind
} from "../constraint.js"
import type { Node, NodeSchema, reducibleKindOf } from "../kinds.js"
import {
	BaseNode,
	appendUniqueFlatRefs,
	type FlatRef,
	type GettableKeyOrNode,
	type KeyOrKeyNode
} from "../node.js"
import type { Predicate } from "../predicate.js"
import type { DivisorSchema } from "../refinements/divisor.js"
import type { ExactLengthSchema } from "../refinements/exactLength.js"
import type { PatternSchema } from "../refinements/pattern.js"
import type {
	ExclusiveDateRangeSchema,
	ExclusiveNumericRangeSchema,
	InclusiveDateRangeSchema,
	InclusiveNumericRangeSchema,
	LimitSchemaValue,
	UnknownRangeSchema
} from "../refinements/range.js"
import type { BaseMeta, BaseNodeDeclaration } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { ArkErrors } from "../shared/errors.js"
import {
	structuralKinds,
	type NodeKind,
	type RootKind,
	type kindRightOf
} from "../shared/implement.js"
import { intersectNodesRoot, pipeNodesRoot } from "../shared/intersections.js"
import { arkKind, hasArkKind } from "../shared/utils.js"
import type {
	StructureInner,
	StructureNode,
	UndeclaredKeyBehavior
} from "../structure/structure.js"
import type { Morph, MorphChildNode, MorphNode } from "./morph.js"
import type { UnionChildKind, UnionChildNode } from "./union.js"

export interface InternalRootDeclaration extends BaseNodeDeclaration {
	kind: RootKind
}

export abstract class BaseRoot<
	/** @ts-expect-error allow cast variance */
	out d extends InternalRootDeclaration = InternalRootDeclaration
> extends BaseNode<d> {
	readonly branches: readonly Node<UnionChildKind>[] =
		this.hasKind("union") ? this.inner.branches : [this as never]

	readonly [arkKind] = "root"

	get internal(): this {
		return this
	}

	as(): this {
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

	intersect(r: unknown): BaseRoot | Disjoint {
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
		return this.$.rootNode(branches) as never
	}

	assert(data: unknown): unknown {
		const result = this.traverse(data)
		return result instanceof ArkErrors ? result.throw() : result
	}

	pick(...keys: KeyOrKeyNode[]): BaseRoot {
		return this.applyStructuralOperation("pick", keys)
	}

	omit(...keys: KeyOrKeyNode[]): BaseRoot {
		return this.applyStructuralOperation("omit", keys)
	}

	required(): BaseRoot {
		return this.applyStructuralOperation("required", [])
	}

	partial(): BaseRoot {
		return this.applyStructuralOperation("partial", [])
	}

	merge(r: unknown): BaseRoot {
		const rNode = this.$.parseRoot(r)
		if (rNode.hasKind("union")) {
			return this.$.rootNode(
				rNode.branches.map(mergedPropsBranch => this.merge(mergedPropsBranch))
			)
		}

		return this.applyStructuralOperation("merge", [r])
	}

	private applyStructuralOperation<
		operation extends "pick" | "omit" | "required" | "partial" | "merge"
	>(operation: operation, args: Parameters<BaseRoot[operation]>): BaseRoot {
		if (this.hasKind("union")) {
			return this.$.rootNode(
				this.branches.map(branch =>
					branch.applyStructuralOperation(operation, args)
				)
			)
		}

		if (this.hasKind("morph")) {
			return this.$.node("morph", {
				...this.inner,
				in: (this.in as BaseRoot).applyStructuralOperation(
					operation,
					args
				) as MorphChildNode
			})
		}

		if (this.hasKind("intersection")) {
			if (!this.inner.structure) {
				throwParseError(
					writeNonStructuralOperandMessage(operation, this.expression)
				)
			}

			const structuralMethodName: keyof StructureNode =
				operation === "required" ? "require"
				: operation === "partial" ? "optionalize"
				: operation

			return this.$.node("intersection", {
				...this.inner,
				structure: this.inner.structure[structuralMethodName](
					...(args as [never])
				)
			})
		}

		if (this.isBasis() && this.domain === "object")
			// if it's an object but has no Structure node, return an empty object
			return $ark.intrinsic.object.internal.bindScope(this.$)

		return throwParseError(
			writeNonStructuralOperandMessage(operation, this.expression)
		)
	}

	get(...path: GettableKeyOrNode[]): BaseRoot {
		if (path[0] === undefined) return this

		if (this.hasKind("union")) {
			return this.branches.reduce(
				(acc, b) => acc.or(b.get(...path)),
				$ark.intrinsic.never.internal
			)
		}

		const branch = this as {} as UnionChildNode

		return (
			branch.structure?.get(
				...(path as {} as NonEmptyList<GettableKeyOrNode>)
			) ??
			throwParseError(writeNonStructuralOperandMessage("get", this.expression))
		)
	}

	extract(r: unknown): BaseRoot {
		const rNode = this.$.parseRoot(r)
		return this.$.rootNode(
			this.branches.filter(branch => branch.extends(rNode))
		) as never
	}

	exclude(r: BaseRoot): BaseRoot {
		const rNode = this.$.parseRoot(r)
		return this.$.rootNode(
			this.branches.filter(branch => !branch.extends(rNode))
		) as never
	}

	array(): BaseRoot {
		return this.$.rootNode(
			{
				proto: Array,
				sequence: this
			},
			{ prereduced: true }
		) as never
	}

	overlaps(r: BaseRoot): boolean {
		const intersection = this.intersect(r as never)
		return !(intersection instanceof Disjoint)
	}

	extends(r: BaseRoot): boolean {
		const intersection = this.intersect(r as never)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}

	subsumes(r: BaseRoot): boolean {
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
			in: this as {} as MorphChildNode,
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

	onDeepUndeclaredKey(behavior: UndeclaredKeyBehavior): BaseRoot {
		return this.onUndeclaredKey({ rule: behavior, deep: true })
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

export const typeOrTermExtends = (t: unknown, base: unknown) =>
	hasArkKind(base, "root") ?
		hasArkKind(t, "root") ? t.extends(base)
		:	base.allows(t)
	: hasArkKind(t, "root") ? t.hasUnit(base)
	: base === t

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

export type StructuralOperationName =
	| "pick"
	| "omit"
	| "get"
	| "required"
	| "partial"
	| "merge"

export const writeNonStructuralOperandMessage = <
	operation extends StructuralOperationName,
	operand extends string
>(
	operation: operation,
	operand: operand
) => `${operation} operand must be an object (was ${operand})`
