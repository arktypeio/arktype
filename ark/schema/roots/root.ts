import {
	bound,
	cached,
	includes,
	omit,
	throwInternalError,
	throwParseError,
	type NonEmptyList,
	type array
} from "@ark/util"
import { throwInvalidOperandError, type Constraint } from "../constraint.js"
import type { NodeSchema, nodeOfKind, reducibleKindOf } from "../kinds.js"
import {
	BaseNode,
	appendUniqueFlatRefs,
	type FlatRef,
	type GettableKeyOrNode,
	type KeyOrKeyNode
} from "../node.js"
import type { Predicate } from "../predicate.js"
import type { Divisor } from "../refinements/divisor.js"
import type { ExactLength } from "../refinements/exactLength.js"
import type { Pattern } from "../refinements/pattern.js"
import type {
	ExclusiveDateRangeSchema,
	ExclusiveNumericRangeSchema,
	InclusiveDateRangeSchema,
	InclusiveNumericRangeSchema,
	LimitSchemaValue,
	UnknownRangeSchema
} from "../refinements/range.js"
import type { BaseNodeDeclaration, MetaSchema } from "../shared/declare.js"
import {
	Disjoint,
	writeUnsatisfiableExpressionError
} from "../shared/disjoint.js"
import { ArkErrors } from "../shared/errors.js"
import {
	structuralKinds,
	type NodeKind,
	type RootKind,
	type kindRightOf
} from "../shared/implement.js"
import { intersectNodesRoot, pipeNodesRoot } from "../shared/intersections.js"
import type { JsonSchema } from "../shared/jsonSchema.js"
import { $ark } from "../shared/registry.js"
import { arkKind, hasArkKind } from "../shared/utils.js"
import type {
	Structure,
	UndeclaredKeyBehavior
} from "../structure/structure.js"
import type { Morph } from "./morph.js"
import type { Union } from "./union.js"

export interface InternalRootDeclaration extends BaseNodeDeclaration {
	kind: RootKind
}

export abstract class BaseRoot<
	/** @ts-ignore cast variance */
	out d extends InternalRootDeclaration = InternalRootDeclaration
> extends BaseNode<d> {
	readonly [arkKind] = "root"

	get internal(): this {
		return this
	}

	as(): this {
		return this
	}

	readonly(): this {
		return this
	}

	readonly branches: readonly nodeOfKind<Union.ChildKind>[] =
		this.hasKind("union") ? this.inner.branches : [this as never]

	distribute<mapOut, reduceOut = mapOut[]>(
		mapBranch: (
			branch: nodeOfKind<Union.ChildKind>,
			i: number,
			branches: array<nodeOfKind<Union.ChildKind>>
		) => mapOut,
		reduceMapped?: (mappedBranches: mapOut[]) => reduceOut
	): reduceOut {
		const mappedBranches = this.branches.map(mapBranch)
		return reduceMapped?.(mappedBranches) ?? (mappedBranches as never)
	}

	abstract get shortDescription(): string

	protected abstract innerToJsonSchema(): JsonSchema

	@cached
	toJsonSchema(): JsonSchema {
		const schema = this.innerToJsonSchema()
		return Object.assign(schema, this.metaJson)
	}

	intersect(r: unknown): BaseRoot | Disjoint {
		const rNode = this.$.parseRoot(r)
		return intersectNodesRoot(this, rNode, this.$) as never
	}

	toNeverIfDisjoint(): BaseRoot {
		return this
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
		return this.$.rootNode(this.applyStructuralOperation("pick", keys))
	}

	omit(...keys: KeyOrKeyNode[]): BaseRoot {
		return this.$.rootNode(this.applyStructuralOperation("omit", keys))
	}

	@cached
	required(): BaseRoot {
		return this.$.rootNode(this.applyStructuralOperation("required", []))
	}

	@cached
	partial(): BaseRoot {
		return this.$.rootNode(this.applyStructuralOperation("partial", []))
	}

	@cached
	keyof(): BaseRoot {
		const result = this.applyStructuralOperation("keyof", []).reduce(
			(result, branch) => result.intersect(branch).toNeverIfDisjoint(),
			$ark.intrinsic.unknown.internal
		)

		if (result.branches.length === 0) {
			throwParseError(
				writeUnsatisfiableExpressionError(`keyof ${this.expression}`)
			)
		}
		return result
	}

	merge(r: unknown): BaseRoot {
		const rNode = this.$.parseRoot(r)
		return this.$.rootNode(
			rNode.distribute(branch =>
				this.applyStructuralOperation("merge", [
					structureOf(branch) ??
						throwParseError(
							writeNonStructuralOperandMessage("merge", branch.expression)
						)
				])
			)
		)
	}

	private applyStructuralOperation<
		operation extends
			| "pick"
			| "omit"
			| "required"
			| "partial"
			| "merge"
			| "keyof"
	>(
		operation: operation,
		args: Parameters<BaseRoot[operation]>
	): Union.ChildNode[] {
		return this.distribute(branch => {
			if (branch.equals($ark.intrinsic.object) && operation !== "merge")
				// ideally this wouldn't be a special case, but for now it
				// allows us to bypass `assertHasKeys` checks on base
				// instantiations of generics like Pick and Omit. Could
				// potentially be removed once constraints can reference each other:
				// https://github.com/arktypeio/arktype/issues/1053
				return branch

			const structure = structureOf(branch)
			if (!structure) {
				throwParseError(
					writeNonStructuralOperandMessage(operation, branch.expression)
				)
			}

			if (operation === "keyof") return structure.keyof()

			const structuralMethodName: keyof Structure.Node =
				operation === "required" ? "require"
				: operation === "partial" ? "optionalize"
				: operation

			return this.$.node("intersection", {
				...branch.inner,
				structure: structure[structuralMethodName](...(args as [never]))
			})
		})
	}

	get(...path: GettableKeyOrNode[]): BaseRoot {
		if (path[0] === undefined) return this

		if (this.hasKind("union")) {
			return this.branches.reduce(
				(acc, b) => acc.or(b.get(...path)),
				$ark.intrinsic.never.internal
			)
		}

		const branch = this as {} as Union.ChildNode

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

	configure(meta: MetaSchema): this {
		return this.configureShallowDescendants(meta)
	}

	describe(description: string): this {
		return this.configure(description)
	}

	from(input: unknown): unknown {
		// ideally we wouldn't validate here but for now we need to do determine
		// which morphs to apply
		return this.assert(input)
	}

	pipe = Object.assign(this._pipe, {
		try: this.tryPipe
	})

	@bound
	protected _pipe(...morphs: Morph[]): BaseRoot {
		return morphs.reduce<BaseRoot>((acc, morph) => acc.pipeOnce(morph), this)
	}

	@bound
	protected tryPipe(...morphs: Morph[]): BaseRoot {
		return morphs.reduce<BaseRoot>(
			(acc, morph) =>
				acc.pipeOnce(
					hasArkKind(morph, "root") ? morph : (
						(In, ctx) => {
							try {
								return morph(In, ctx)
							} catch (e) {
								return ctx.error({
									code: "predicate",
									predicate: morph as never,
									actual: `aborted due to error:\n    ${e}\n`
								})
							}
						}
					)
				),
			this
		)
	}

	to(def: unknown): BaseRoot {
		return this.toNode(this.$.parseRoot(def))
	}

	private toNode(root: BaseRoot): BaseRoot {
		const result = pipeNodesRoot(this, root, this.$)
		if (result instanceof Disjoint) return result.throw()
		return result as BaseRoot
	}

	private pipeOnce(morph: Morph): BaseRoot {
		if (hasArkKind(morph, "root")) return this.toNode(morph)

		return this.distribute(
			node =>
				node.hasKind("morph") ?
					this.$.node("morph", {
						in: node.in,
						morphs: [...node.morphs, morph]
					})
				:	this.$.node("morph", {
						in: node,
						morphs: [morph]
					}),
			branches => this.$.rootNode(branches)
		)
	}

	@cached
	get flatMorphs(): array<FlatRef<Morph.Node>> {
		return this.flatRefs.reduce<FlatRef<Morph.Node>[]>(
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
					: ref.node.hasKind("morph") ? (ref as FlatRef<Morph.Node>)
					: []
				),
			[]
		)
	}

	narrow(predicate: Predicate): BaseRoot {
		return this.constrainOut("predicate", predicate)
	}

	constrain<kind extends Constraint.PrimitiveKind>(
		kind: kind,
		schema: NodeSchema<kind>
	): BaseRoot {
		return this._constrain("root", kind, schema)
	}

	constrainIn<kind extends Constraint.PrimitiveKind>(
		kind: kind,
		schema: NodeSchema<kind>
	): BaseRoot {
		return this._constrain("in", kind, schema)
	}

	constrainOut<kind extends Constraint.PrimitiveKind>(
		kind: kind,
		schema: NodeSchema<kind>
	): BaseRoot {
		return this._constrain("out", kind, schema)
	}

	private _constrain(
		io: "root" | "in" | "out",
		kind: Constraint.PrimitiveKind,
		schema: any
	): BaseRoot {
		const constraint = this.$.node(kind, schema as never)

		if (constraint.isRoot()) {
			// if the node reduces to `unknown`, nothing to do (e.g. minLength: 0)
			return constraint.isUnknown() ? this : (
					throwInternalError(`Unexpected constraint node ${constraint}`)
				)
		}

		const operand = io === "root" ? this : this[io]
		if (
			operand.hasKind("morph") ||
			(constraint.impliedBasis && !operand.extends(constraint.impliedBasis))
		) {
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
			io === "out" ?
				pipeNodesRoot(this, partialIntersection, this.$)
			:	intersectNodesRoot(this, partialIntersection, this.$)

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
						omit(inner as Structure.Inner, { undeclared: 1 })
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

	divisibleBy(schema: Divisor.Schema): BaseRoot {
		return this.constrain("divisor", schema)
	}

	matching(schema: Pattern.Schema): BaseRoot {
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

	exactlyLength(schema: ExactLength.Schema): BaseRoot {
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

export const typeOrTermExtends = (t: unknown, base: unknown): boolean =>
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

const structureOf = (branch: Union.ChildNode): Structure.Node | null => {
	if (branch.hasKind("morph")) return null

	if (branch.hasKind("intersection")) {
		return (
			branch.inner.structure ??
			(branch.basis?.domain === "object" ?
				$ark.intrinsic.emptyStructure.bindScope(branch.$)
			:	null)
		)
	}

	if (branch.isBasis() && branch.domain === "object")
		return $ark.intrinsic.emptyStructure.bindScope(branch.$)

	return null
}

export type StructuralOperationName =
	| "keyof"
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
): writeNonStructuralOperandMessage<operation, operand> =>
	`${operation} operand must be an object (was ${operand})`

export type writeNonStructuralOperandMessage<
	operation extends StructuralOperationName,
	operand extends string
> = `${operation} operand must be an object (was ${operand})`
