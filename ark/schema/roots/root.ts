import {
	arkKind,
	arrayEquals,
	flatMorph,
	includes,
	inferred,
	isEmptyObject,
	isInstanceOf,
	omit,
	throwInternalError,
	throwParseError,
	type Fn,
	type array,
	type dict
} from "@ark/util"
import { mergeToJsonSchemaConfigs } from "../config.ts"
import {
	constraintInputOf,
	throwInvalidOperandError,
	type Constraint
} from "../constraint.ts"
import type { nodeOfKind, reducibleKindOf } from "../kinds.ts"
import {
	BaseNode,
	flatMorphsAreEqual,
	innerHashesMatch,
	isMutuallySimulated,
	referencesWithoutCases,
	type DeepNodeTransformContext,
	type DeepNodeTransformation,
	type GettableKeyOrNode,
	type KeyOrKeyNode,
	type NodeSelector
} from "../node.ts"
import type { Predicate } from "../predicate.ts"
import type { Divisor } from "../refinements/divisor.ts"
import type { ExactLength } from "../refinements/exactLength.ts"
import type { Pattern } from "../refinements/pattern.ts"
import type {
	ExclusiveDateRangeSchema,
	ExclusiveNumericRangeSchema,
	InclusiveDateRangeSchema,
	InclusiveNumericRangeSchema,
	LimitSchemaValue,
	UnknownRangeSchema
} from "../refinements/range.ts"
import type {
	ArkEnv,
	BaseNodeDeclaration,
	BaseNodeInput,
	TypeMeta
} from "../shared/declare.ts"
import {
	Disjoint,
	writeUnsatisfiableExpressionError
} from "../shared/disjoint.ts"
import { isCustomError, type MessageConfig } from "../shared/errors.ts"
import { ArkErrors } from "../shared/issues.ts"
import { standardFailureOf } from "../shared/standardFailure.ts"
import {
	structuralKinds,
	type NodeKind,
	type RootKind,
	type kindRightOf
} from "../shared/implement.ts"
import {
	validateStandardJsonSchemaTarget,
	type JsonSchema
} from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import { sets } from "../shared/sets.ts"
import type {
	StandardJSONSchemaV1,
	StandardSchemaV1
} from "../shared/standardSchema.ts"
import { ToJsonSchema } from "../shared/toJsonSchema.ts"
import {
	inContext,
	tryMorph,
	withContextOf,
	type ContextualTarget
} from "../shared/traversal.ts"
import { hasArkKind, isNode, isResolutionFinal } from "../shared/utils.ts"
import {
	assertDefaultValueAssignability,
	type Optional
} from "../structure/optional.ts"
import type { Prop } from "../structure/prop.ts"
import type { Sequence } from "../structure/sequence.ts"
import type {
	PropFlatMapper,
	Structure,
	UndeclaredKeyBehavior
} from "../structure/structure.ts"
import type { Intersection } from "./intersection.ts"
import type { Morph } from "./morph.ts"
import type { Union } from "./union.ts"

// arktype/codecs installs encoding, so an app that doesn't encode doesn't ship it
export const encodeWithoutCodecsMessage =
	'.encode requires import "arktype/codecs"'

export interface InternalRootDeclaration extends BaseNodeDeclaration {
	kind: RootKind
}

export abstract class BaseRoot<
		/** @ts-ignore cast variance */
		out d extends InternalRootDeclaration = InternalRootDeclaration
	>
	extends BaseNode<d>
	implements StandardSchemaV1, StandardJSONSchemaV1
{
	declare readonly [inferred]: unknown

	// define as a getter to avoid it being enumerable/spreadable
	get [arkKind](): "root" {
		return "root"
	}

	// doesn't seem possible to override this at a type-level (e.g. via declare)
	// without TS complaining about getters
	override get _in(): BaseRoot {
		return super._in as never
	}

	override get _out(): BaseRoot {
		return super._out as never
	}

	get internal(): this {
		return this
	}

	get "~standard"(): StandardSchemaV1.ArkTypeProps {
		return (this.c.standard ??=
			Object.defineProperty<StandardSchemaV1.ArkTypeProps>(
				{
					vendor: "arktype",
					version: 1,
					validate: (input, options) => {
						const context = options?.libraryOptions?.context
						// Standard Schema returns its issues, so a configured onFail
						// that throws or returns something else isn't called
						const out =
							context === undefined ?
								this.traverse(input)
							:	inContext(context as never, () => this.traverse(input))
						return out instanceof ArkErrors ?
								standardFailureOf(out as ArkErrors)
							:	{ value: out }
					},
					jsonSchema: {
						// _in has no defaults, so the input is this Type as it's accepted
						input: opts => toStandardJsonSchema(this, opts, "in"),
						output: opts => toStandardJsonSchema(this._out, opts, "out")
					}
				},
				// whether an issue of its own is custom, which another copy of
				// arktype asks as it reads one, since only this one's errors can
				// tell. Not enumerable, so its props read as Standard Schema's
				"_c",
				{ value: isCustomError }
			))
	}

	as(): this {
		return this
	}

	brand(name: string): this {
		if (name === "") return throwParseError(emptyBrandNameMessage)
		return this
	}

	readonly(): this {
		return this
	}

	readonly branches: readonly nodeOfKind<Union.ChildKind>[] =
		this.is("union") ? this.inner.branches : [this as never]

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

	/** its description when none is configured */
	abstract get brief(): string

	toJsonSchema(opts: ToJsonSchema.Options = {}): JsonSchema {
		return sets().toJsonSchema(this, opts)
	}

	toJsonSchemaRecurse(ctx: ToJsonSchema.Context): JsonSchema {
		return sets().toJsonSchemaRecurse(this, ctx)
	}

	get alwaysExpandJsonSchema(): boolean {
		return (
			this.isBasis() ||
			this.kind === "alias" ||
			(this.is("union") && this.isBoolean)
		)
	}

	intersect(r: unknown, jit = true): BaseRoot | Disjoint {
		const rNode = this.$.parseDef(r)
		const result = this.rawIntersect(rNode)
		if (result instanceof Disjoint) return result
		return this.$.fin(result as BaseRoot, jit)
	}

	rawIntersect(r: BaseRoot): BaseRoot {
		return sets().intersect(this, r, this.$) as never
	}

	toNeverIfDisjoint(): BaseRoot {
		return this
	}

	and(r: unknown): BaseRoot {
		const result = this.intersect(r)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	rawAnd(r: BaseRoot): BaseRoot {
		const result = this.rawIntersect(r)
		return result instanceof Disjoint ? result.throw() : result
	}

	or(r: unknown): BaseRoot {
		const rNode = this.$.parseDef(r)
		return this.$.fin(this.rawOr(rNode)) as never
	}

	rawOr(r: BaseRoot): BaseRoot {
		const branches = [...this.branches, ...(r.branches as any)]
		return this.$.node("union", { branches }) as never
	}

	private rootOfBranches(branches: readonly BaseRoot[]): BaseRoot {
		return this.$.fin(this.$.node("union", { branches }))
	}

	map(flatMapEntry: PropFlatMapper): BaseRoot {
		return this.$.schema(this.applyStruct("map", [flatMapEntry]))
	}

	pick(...keys: KeyOrKeyNode[]): BaseRoot {
		return this.$.schema(this.applyStruct("pick", keys))
	}

	omit(...keys: KeyOrKeyNode[]): BaseRoot {
		return this.$.schema(this.applyStruct("omit", keys))
	}

	required(): BaseRoot {
		return this.$.schema(this.applyStruct("required", []))
	}

	partial(): BaseRoot {
		return this.$.schema(this.applyStruct("partial", []))
	}

	keyof(): BaseRoot {
		if (this.c.keyof) return this.c.keyof
		const result = this.applyStruct("keyof", []).reduce(
			(result, branch) => result.intersect(branch).toNeverIfDisjoint(),
			$ark.kw.unknown.internal
		)

		if (result.branches.length === 0) {
			throwParseError(
				writeUnsatisfiableExpressionError(`keyof ${this.expression}`)
			)
		}
		return (this.c.keyof = this.$.fin(result))
	}

	get props(): Prop.Node[] {
		if (this.branches.length !== 1)
			return throwParseError(writeLiteralUnionEntriesMessage(this.expression))
		return [...this.applyStruct("props", [])[0]]
	}

	merge(r: unknown): BaseRoot {
		const rNode = this.$.parseDef(r)
		// like a spread, merge only extends object literals
		for (const branch of [...this.branches, ...rNode.branches]) {
			const basis = branch.is("intersection") ? branch.basis : branch
			if (basis?.is("proto"))
				throwParseError(writeInvalidMergeOperandMessage(branch.expression))
		}
		return this.rootOfBranches(
			rNode.branches.flatMap(branch => {
				const merged = this.applyStruct("merge", [
					structureOf(branch) ??
						throwParseError(
							writeNonStructuralOperandMessage("merge", branch.expression)
						)
				])
				// the merged-in object's settings and meta are the result's, as a spread's are
				return isEmptyObject(branch.meta) ? merged : (
						merged.map(result => result.configure(branch.meta))
					)
			})
		)
	}

	/** applies a structural operation like pick or omit to each branch's structure */
	private applyStruct<operation extends StructuralOperationName>(
		operation: operation,
		args: BaseRoot[operation] extends Fn<infer args> ? args : []
	): StructuralOperationBranchResultByName[operation][] {
		return this.distribute(branch => {
			if (
				branch.equals($ark.kw.object) &&
				operation !== "merge" &&
				operation !== "props"
			)
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
			if (operation === "get") return structure.get(...(args as [never]))
			if (operation === "props") return structure.props

			const structuralMethodName: keyof Structure.Node =
				operation === "required" ? "require"
				: operation === "partial" ? "optionalize"
				: operation

			const transformed = structure[structuralMethodName](
				...(args as [never])
			) as Structure.Node

			// like the mapped types they're named for, `required` and `partial` are
			// homomorphic, preserving an array or tuple base
			const isHomomorphic = operation === "required" || operation === "partial"

			// they are also the only operations that can be a no-op (e.g. on an
			// array with no fixed elements), in which case the original branch is
			// preserved rather than reduced to a new object
			if (isHomomorphic && transformed.equals(structure)) return branch

			return this.$.node("intersection", {
				...(isHomomorphic && transformed.sequence ?
					{ proto: this.$.node("proto", { proto: Array }) }
				:	{ domain: this.$.node("domain", { domain: "object" }) }),
				structure: transformed
			})
		})
	}

	get(...path: GettableKeyOrNode[]): BaseRoot {
		if (path[0] === undefined) return this

		return this.$.schema(this.applyStruct("get", path)) as never
	}

	extract(r: unknown): BaseRoot {
		return this.$.schema(
			filterBranches(this.branches, this.$.parseDef(r)).extracted
		) as never
	}

	exclude(r: unknown): BaseRoot {
		return this.$.schema(
			filterBranches(this.branches, this.$.parseDef(r)).excluded
		) as never
	}

	array(): BaseRoot {
		return this.$.fin(this.rawArray())
	}

	rawArray(): BaseRoot {
		const proto = this.$.node("proto", { proto: Array })
		if (this.isUnknown()) return proto
		return this.$.node(
			"intersection",
			{
				proto,
				structure: this.$.node("structure", {
					sequence: this.$.node("sequence", { variadic: this })
				})
			},
			{ reduced: true }
		) as never
	}

	overlaps(r: unknown): boolean {
		if (this.isNever()) return false
		const l = withoutDefaults(this)
		const rNode = withoutDefaults(this.$.parseDef(r))
		if (rNode.isNever()) return false
		const intersection = l.intersect(rNode, false)
		return !(intersection instanceof Disjoint) && !intersection.isNever()
	}

	extends(r: unknown): boolean {
		// a node equal to r extends it, without intersecting them
		if (
			this.isNever() ||
			(isNode(r) && this.kind === r.kind && innerHashesMatch(this, r))
		)
			return true

		const l = withoutDefaults(this)
		const rNode = withoutDefaults(this.$.parseDef(r))
		if (l.kind === rNode.kind && innerHashesMatch(l, rNode)) return true
		const intersection = l.intersect(rNode, false)
		if (intersection instanceof Disjoint) return false
		// meta like a description doesn't change the values a node allows
		return (
			l.equals(intersection) ||
			(!l.hasAlias &&
				!intersection.hasAlias &&
				isMutuallySimulated(l, intersection))
		)
	}

	/** transforms this root inside an enclosing transform, sharing its cycle state */
	transformWithin(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformContext
	): BaseRoot | null {
		return this._tf(mapper, {
			...ctx,
			undeclaredHandling: undefined
		}) as BaseRoot | null
	}

	ifExtends(r: unknown): BaseRoot | undefined {
		return this.extends(r) ? this : undefined
	}

	subsumes(r: unknown): boolean {
		const rNode = this.$.parseDef(r)
		return rNode.extends(this)
	}

	configure(
		meta: TypeMeta.MappableInput,
		selector: NodeSelector = "shallow"
	): this {
		return this.configureRefs(meta, selector)
	}

	describe(description: string, selector: NodeSelector = "shallow"): this {
		return this.configure({ description }, selector)
	}

	message(message: MessageConfig, selector: NodeSelector = "shallow"): this {
		return this.configure({ message }, selector)
	}

	label(label: string, selector: NodeSelector = "shallow"): this {
		return this.configure({ label }, selector)
	}

	// these should ideally be implemented in arktype since they use its syntax
	// https://github.com/arktypeio/arktype/issues/1223
	optional(): [this, "?"] {
		return [this, "?"]
	}

	// these should ideally be implemented in arktype since they use its syntax
	// https://github.com/arktypeio/arktype/issues/1223
	default(thunkableValue: unknown): [this, "=", unknown] {
		assertDefaultValueAssignability(this, thunkableValue, null)

		return [this, "=", thunkableValue]
	}

	from(input: unknown): unknown {
		// ideally we might not validate here but for now we need to do determine
		// which morphs to apply
		return this.assert(input)
	}

	withContext(context: ArkEnv.context): ContextualTarget {
		return withContextOf(this as never, context)
	}

	protected _pipe(...morphs: Morph[]): BaseRoot {
		const result = morphs.reduce<BaseRoot>(
			(acc, morph) => acc.rawPipeOnce(morph),
			this
		)
		return this.$.fin(result)
	}

	protected tryPipe(...morphs: Morph[]): BaseRoot {
		return this._pipe(
			...morphs.map(morph =>
				hasArkKind(morph, "root") ? morph : makeMorph(tryMorph, morph)
			)
		)
	}

	// bound when first read, since it can be detached
	get pipe(): ((...morphs: Morph[]) => BaseRoot) & {
		try: (...morphs: Morph[]) => BaseRoot
	} {
		return (this.c.pipe ??= Object.assign(this._pipe.bind(this), {
			try: this.tryPipe.bind(this)
		}))
	}

	to(def: unknown): BaseRoot {
		return this.$.fin(this.toNode(this.$.parseDef(def)))
	}

	private toNode(root: BaseRoot): BaseRoot {
		const result = sets().pipe(this, root, this.$)
		if (result instanceof Disjoint) return result.throw()
		return result as BaseRoot
	}

	get encode(): BaseRoot {
		return ($ark.encode ?? throwParseError(encodeWithoutCodecsMessage))(this)
	}

	rawPipeOnce(morph: Morph): BaseRoot {
		if (hasArkKind(morph, "root")) {
			return this.toNode(
				isInstanceOf(morph, BaseRoot) ? morph.internal : this.$.parseDef(morph)
			)
		}

		return this.distribute(
			branch =>
				this.$.node("morph", {
					morphs:
						branch.is("morph") ? [...branch.morphs, morph] : [branch, morph]
				}),
			branches => this.$.node("union", { branches })
		)
	}

	narrow(predicate: Predicate): BaseRoot {
		return this.constrainOut("predicate", predicate)
	}

	constrain<kind extends Constraint.PrimitiveKind>(
		kind: kind,
		schema: Constraint.Schema<kind>
	): BaseRoot {
		return this.$.fin(this._constrain("root", kind, schema))
	}

	constrainIn<kind extends Constraint.PrimitiveKind>(
		kind: kind,
		schema: Constraint.Schema<kind>
	): BaseRoot {
		return this.$.fin(this._constrain("in", kind, schema))
	}

	constrainOut<kind extends Constraint.PrimitiveKind>(
		kind: kind,
		schema: Constraint.Schema<kind>
	): BaseRoot {
		return this.$.fin(this._constrain("out", kind, schema))
	}

	rawConstrain<kind extends Constraint.PrimitiveKind>(
		kind: kind,
		schema: Constraint.Schema<kind>
	): BaseRoot {
		return this._constrain("root", kind, schema)
	}

	/** constrains its output, like constrainOut, without finalizing it */
	rawConstrainOut<kind extends Constraint.PrimitiveKind>(
		kind: kind,
		schema: Constraint.Schema<kind>
	): BaseRoot {
		return this._constrain("out", kind, schema)
	}

	private _constrain(
		io: "root" | "in" | "out",
		kind: Constraint.PrimitiveKind,
		schema: any
	): BaseRoot {
		const constraint = this.$.node(kind, constraintInputOf(kind, schema))

		if (constraint.isRoot()) {
			// if the node reduces to `unknown`, nothing to do (e.g. minLength: 0)
			return constraint.isUnknown() ? this : (
					throwInternalError(`Unexpected constraint node ${constraint}`)
				)
		}

		// an intersection's output is one too, so one that needn't meet a basis isn't written
		if (
			io !== "out" ||
			constraint.implied ||
			!this.is("intersection") ||
			this.hasAlias
		) {
			const operand =
				io === "root" ? this
				: io === "in" ? this._in
				: this._out
			if (
				operand.is("morph") ||
				(constraint.implied &&
					!meetsImplied(operand, constraint.implied) &&
					!operand.extends(constraint.implied))
			) {
				return throwInvalidOperandError(
					kind,
					// a predicate implies no basis, but can't constrain a morph either
					(constraint.implied ?? $ark.kw.unknown.internal) as never,
					this as never
				)
			}
		}

		// a basis has no constraint to meet, and a constraint alone has nothing to reduce
		const meetsBasis =
			io === "root" && this.hasKindIn("domain", "proto") && kind !== "predicate"

		const inner: dict = {}
		if (meetsBasis) inner[this.kind] = this
		// important this is constraint.kind instead of kind in case
		// the node was reduced during parsing
		inner[constraint.kind] = constraint.impl.stacks ? [constraint] : constraint
		let result: BaseNode | Disjoint | null
		// an intersection meets a constraint without a node holding only that
		if (io !== "out" && this.is("intersection"))
			result = sets().constrain(this, inner, this.$)
		else {
			const partialIntersection = this.$.node("intersection", inner, {
				reduced: true
			})

			if (meetsBasis) return partialIntersection

			result =
				io === "out" ?
					sets().pipe(this, partialIntersection, this.$)
				:	sets().intersect(this, partialIntersection, this.$)
		}

		if (result instanceof Disjoint) result.throw()

		return result as never
	}

	onUndeclaredKey(cfg: UndeclaredKeyBehavior | UndeclaredKeyConfig): BaseRoot {
		const rule = typeof cfg === "string" ? cfg : cfg.rule
		const deep = typeof cfg === "string" ? false : cfg.deep
		return this.$.fin(
			this.transform(
				(kind, inner) =>
					kind === "structure" ? { ...inner, undeclared: rule } : inner,
				deep ? undefined : (
					{ shouldTf: node => !includes(structuralKinds, node.kind) }
				)
			)
		)
	}

	/** whether the morphs of `r` are the same as its own */
	sameMorphs(r: BaseRoot): boolean {
		if (!this.alters && !r.alters) return true

		if (!arrayEquals(this.topMorphs as Morph[], r.topMorphs as Morph[]))
			return false

		if (
			!arrayEquals(this.flatMorphs, r.flatMorphs, {
				isEqual: flatMorphsAreEqual
			})
		)
			return false

		return true
	}

	/** whether deleting undeclared keys is all it does to the data it allows, if it does anything */
	get deletesOnly(): boolean {
		return !this.hasAlias && !this.hasMorph && !reachesDefault(this)
	}

	onDeepUndeclaredKey(behavior: UndeclaredKeyBehavior): BaseRoot {
		return this.onUndeclaredKey({ rule: behavior, deep: true })
	}

	filter(predicate: Predicate): BaseRoot {
		return this.constrainIn("predicate", predicate)
	}

	divisibleBy(schema: Divisor.Schema, message?: MessageConfig): BaseRoot {
		return this.constrain("divisor", withMessage("divisor", schema, message))
	}

	matching(schema: Pattern.Schema, message?: MessageConfig): BaseRoot {
		return this.constrain("pattern", withMessage("pattern", schema, message))
	}

	atLeast(
		schema: InclusiveNumericRangeSchema,
		message?: MessageConfig
	): BaseRoot {
		return this.constrain("min", withMessage("min", schema, message))
	}

	atMost(
		schema: InclusiveNumericRangeSchema,
		message?: MessageConfig
	): BaseRoot {
		return this.constrain("max", withMessage("max", schema, message))
	}

	moreThan(
		schema: ExclusiveNumericRangeSchema,
		message?: MessageConfig
	): BaseRoot {
		return this.constrain(
			"min",
			withMessage("min", exclusivizeRangeSchema(schema), message)
		)
	}

	lessThan(
		schema: ExclusiveNumericRangeSchema,
		message?: MessageConfig
	): BaseRoot {
		return this.constrain(
			"max",
			withMessage("max", exclusivizeRangeSchema(schema), message)
		)
	}

	atLeastLength(
		schema: InclusiveNumericRangeSchema,
		message?: MessageConfig
	): BaseRoot {
		return this.constrain(
			"minLength",
			withMessage("minLength", schema, message)
		)
	}

	atMostLength(
		schema: InclusiveNumericRangeSchema,
		message?: MessageConfig
	): BaseRoot {
		return this.constrain(
			"maxLength",
			withMessage("maxLength", schema, message)
		)
	}

	moreThanLength(
		schema: ExclusiveNumericRangeSchema,
		message?: MessageConfig
	): BaseRoot {
		return this.constrain(
			"minLength",
			withMessage("minLength", exclusivizeRangeSchema(schema), message)
		)
	}

	lessThanLength(
		schema: ExclusiveNumericRangeSchema,
		message?: MessageConfig
	): BaseRoot {
		return this.constrain(
			"maxLength",
			withMessage("maxLength", exclusivizeRangeSchema(schema), message)
		)
	}

	exactlyLength(schema: ExactLength.Schema, message?: MessageConfig): BaseRoot {
		return this.constrain(
			"exactLength",
			withMessage("exactLength", schema, message)
		)
	}

	atOrAfter(
		schema: InclusiveDateRangeSchema,
		message?: MessageConfig
	): BaseRoot {
		return this.constrain("after", withMessage("after", schema, message))
	}

	atOrBefore(
		schema: InclusiveDateRangeSchema,
		message?: MessageConfig
	): BaseRoot {
		return this.constrain("before", withMessage("before", schema, message))
	}

	laterThan(
		schema: ExclusiveDateRangeSchema,
		message?: MessageConfig
	): BaseRoot {
		return this.constrain(
			"after",
			withMessage("after", exclusivizeRangeSchema(schema), message)
		)
	}

	earlierThan(
		schema: ExclusiveDateRangeSchema,
		message?: MessageConfig
	): BaseRoot {
		return this.constrain(
			"before",
			withMessage("before", exclusivizeRangeSchema(schema), message)
		)
	}
}

export type MadeMorph = [
	make: (...args: never[]) => Morph,
	args: readonly unknown[]
]

// a morph arktype makes from values, which a standalone build makes again
export const madeMorphs: WeakMap<Morph, MadeMorph> = new WeakMap()

export const makeMorph = <args extends unknown[]>(
	make: (...args: args) => Morph,
	...args: args
): Morph => {
	const morph = make(...args)
	madeMorphs.set(morph, [make as never, args])
	return morph
}

export type UndeclaredKeyConfig = {
	rule: UndeclaredKeyBehavior
	deep?: boolean
}

const isDefaultedNode = (node: BaseNode): boolean =>
	(node.is("optional") && node.hasDef()) ||
	(node.is("sequence") && node.defLen !== 0)

const reachesDefaultCache = /* @__PURE__ */ new WeakMap<BaseRoot, boolean>()
const withoutDefaultsCache = /* @__PURE__ */ new WeakMap<BaseRoot, BaseRoot>()

const computeReachesDefault = (root: BaseRoot, final: boolean): boolean => {
	if (!root.alters && !(final && root.tfs)) return false
	const followAliases = root.hasAlias && final
	const visited = new Set<BaseNode>()
	const queue: BaseNode[] = [root]
	for (let i = 0; i < queue.length; i++) {
		for (const ref of referencesWithoutCases(queue[i])) {
			if (visited.has(ref)) continue
			visited.add(ref)
			if (isDefaultedNode(ref)) return true
			if (followAliases && ref.is("alias")) queue.push(ref.resolution)
		}
	}
	return false
}

const reachesDefault = (root: BaseRoot): boolean => {
	if (!root.alters && !root.hasAlias) return false
	const final = isResolutionFinal()
	const cacheable = final || !root.hasAlias
	if (cacheable) {
		const cached = reachesDefaultCache.get(root)
		if (cached !== undefined) return cached
	}
	const result = computeReachesDefault(root, final)
	if (cacheable) reachesDefaultCache.set(root, result)
	return result
}

// defaults are input-side annotations, not constraints on which inputs a type allows
const withoutDefaults = (node: BaseRoot): BaseRoot => {
	if (!node.alters && !node.hasAlias) return node
	const final = isResolutionFinal()
	const cacheable = final || !node.hasAlias
	if (cacheable) {
		const cached = withoutDefaultsCache.get(node)
		if (cached !== undefined) return cached
	}
	const result =
		reachesDefault(node) ?
			(node.transform(
				(kind, inner) => {
					if (kind === "optional" && "default" in inner)
						return omit(inner as Optional.Inner, { default: 1 })
					if (kind === "sequence" && (inner as Sequence.Inner).defaultables) {
						const { defaultables, optionals, ...rest } = inner as Sequence.Inner
						return {
							...rest,
							optionals: [
								...defaultables!.map(([element]) => element),
								...(optionals ?? [])
							]
						}
					}
					return inner
				},
				{
					shouldTf: n =>
						n.alters || (n.is("optional") && n.hasDef()) || (final && n.tfs)
				}
			) as BaseRoot)
		:	node
	if (cacheable) withoutDefaultsCache.set(node, result)
	return result
}

export const emptyBrandNameMessage = `Expected a non-empty brand name after #`

export type emptyBrandNameMessage = typeof emptyBrandNameMessage

const toStandardJsonSchema = (
	node: BaseRoot,
	opts: StandardJSONSchemaV1.Options,
	io: "in" | "out"
): Record<string, unknown> => {
	const target = validateStandardJsonSchemaTarget(opts.target)
	const ctx = mergeToJsonSchemaConfigs(node.$.cfg.toJsonSchema, {
		...opts.libraryOptions,
		target
	})
	const fallback = flatMorph(ctx.fallback, (code, handler) => [
		code,
		handler === ToJsonSchema.defaultConfig.fallback[code] ?
			ToJsonSchema.standardFallback[code]
		:	handler
	]) as ToJsonSchema.HandlerByCode
	return node.toJsonSchema({ ...ctx, fallback, io }) as never
}

// a constraint's schema, with the message passed beside it configured on that
// constraint alone, as its own meta, so another of its kind keeps its text
const withMessage = <kind extends Constraint.PrimitiveKind>(
	kind: kind,
	schema: Constraint.Schema<kind>,
	message: MessageConfig | undefined
): Constraint.Schema<kind> => {
	if (message === undefined) return schema
	const input = constraintInputOf(kind, schema) as BaseNodeInput
	const meta: object | undefined =
		typeof input.meta === "string" ? { description: input.meta } : input.meta
	return { ...input, meta: { ...meta, message } } as never
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

// what a basis extends, so does anything that constrains it, without intersecting them
const meetsImplied = (operand: BaseRoot, implied: BaseRoot): boolean => {
	const basis = operand.is("intersection") ? operand.basis : operand
	if (!basis) return false
	if (basis.kind === implied.kind) return innerHashesMatch(basis, implied)
	return (
		implied.is("union") &&
		implied.branches.some(
			branch => branch.kind === basis.kind && innerHashesMatch(basis, branch)
		)
	)
}

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
	if (branch.is("morph")) return null

	if (branch.is("intersection")) {
		return (
			branch.inner.structure ??
			(branch.basis?.domain === "object" ?
				branch.$.bindRef($ark.kw.emptyStructure)
			:	null)
		)
	}

	if (branch.isBasis() && branch.domain === "object")
		return branch.$.bindRef($ark.kw.emptyStructure)

	return null
}

type FilteredBranches = {
	extracted: Union.ChildNode[]
	excluded: Union.ChildNode[]
}

// a union merges branches alike but for a range, one key's value or a morph's
// input, so a branch is filtered as the branches that would merge to it are:
// those extending r are extracted and the rest excluded. A branch nothing
// merges to, like a basis, is still one or the other whole
const filterBranches = (
	branches: readonly Union.ChildNode[],
	r: BaseRoot
): FilteredBranches => {
	const result: FilteredBranches = { extracted: [], excluded: [] }
	for (const branch of branches) {
		if (branch.extends(r)) result.extracted.push(branch)
		else if (!branch.hasKindIn("intersection", "morph"))
			result.excluded.push(branch)
		else {
			// each branch of r is extracted from what the last left
			let excluded: Union.ChildNode[] = [branch]
			for (const rBranch of r.branches) {
				excluded = excluded.flatMap(piece => {
					const split =
						r.branches.length > 1 && piece.extends(rBranch) ?
							{ extracted: [piece], excluded: [] }
						:	splitBranch(piece, rBranch)
					result.extracted.push(...split.extracted)
					return split.excluded
				})
			}
			result.excluded.push(...excluded)
		}
	}
	return result
}

const unsplit = (branch: Union.ChildNode): FilteredBranches => ({
	extracted: [],
	excluded: [branch]
})

// what would merge to a branch that doesn't extend r, or, if none of that
// extends r either, the branch as it is
const splitBranch = (
	branch: Union.ChildNode,
	r: Union.ChildNode
): FilteredBranches => {
	// nothing a branch disjoint from r splits into extends it, and its values
	// alone can hold morphs that can't be related to r's
	if (!branch.overlaps(r)) return unsplit(branch)
	const intervals = intervalsOf(branch)
	if (intervals) {
		const extracted = intervals.filter(interval => interval.extends(r))
		return extracted.length ?
				{
					extracted,
					excluded: intervals.filter(interval => !extracted.includes(interval))
				}
			:	unsplit(branch)
	}
	if (branch.is("morph")) {
		// a morph extends what its input does, or a morph alike whose input its own extends
		const rHead =
			!r.is("morph") ? r
			: branch.sameMorphs(r) && !r.declaredIn ? r.head
			: undefined
		if (!branch.head || branch.declaredIn || !rHead) return unsplit(branch)
		const head = filterBranches(branch.head.branches, rHead)
		if (!head.extracted.length || !head.excluded.length) return unsplit(branch)
		const withHead = (branches: Union.ChildNode[]) =>
			branch.$.node("morph", {
				...branch.inner,
				morphs: [branch.$.node("union", { branches }), ...branch.piped],
				meta: branch.meta
			})
		const extracted = withHead(head.extracted)
		return extracted.extends(r) ?
				{
					extracted: [...extracted.branches],
					excluded: [...withHead(head.excluded).branches]
				}
			:	unsplit(branch)
	}
	if (!branch.is("intersection") || !r.is("intersection") || !r.structure)
		return unsplit(branch)
	let extracted = branch
	const excluded: Union.ChildNode[] = []
	for (const prop of branch.structure?.props ?? []) {
		const rProp = r.structure.byKey[prop.key]
		// as a union merges neither a default nor a value that could reach it
		if (!rProp || prop.hasDef() || prop.value.hasAlias) continue
		const value = filterBranches(prop.value.branches, rProp.value)
		if (!value.extracted.length) return unsplit(branch)
		if (!value.excluded.length) continue
		// the values a key before this one excluded are already listed
		excluded.push(...withPropValue(extracted, prop, value.excluded).branches)
		extracted = withPropValue(extracted, prop, value.extracted)
	}
	return extracted !== branch && extracted.extends(r) ?
			{ extracted: [extracted], excluded }
		:	unsplit(branch)
}

// the ranges either side of each value a branch excludes, which a union of
// them merges to it
const intervalsOf = (branch: Union.ChildNode): Union.ChildNode[] | null => {
	if (!branch.is("intersection")) return null
	const excluded = branch.inner.notEqual ?? branch.inner.notEqualLength
	// a bound rejects NaN and an invalid Date, which a basis allowing them keeps
	if (
		!excluded ||
		branch.inner.domain?.numberAllowsNaN ||
		branch.inner.proto?.dateAllowsInvalid
	)
		return null
	const [lower, upper] =
		excluded[0].kind === "notEqualLength" ?
			(["minLength", "maxLength"] as const)
		: excluded[0].rule instanceof Date ? (["after", "before"] as const)
		: (["min", "max"] as const)
	const boundAt = (kind: typeof lower | typeof upper, i: number) =>
		branch.$.node(kind, {
			...constraintInputOf(kind, { rule: excluded[i].rule, exclusive: true }),
			meta: excluded[i].meta
		} as never)
	const intervals: Union.ChildNode[] = []
	for (let i = 0; i <= excluded.length; i++) {
		const inner: dict = {}
		if (i > 0) inner[lower] = boundAt(lower, i - 1)
		if (i < excluded.length) inner[upper] = boundAt(upper, i)
		const interval = branch.intersect(
			branch.$.node("intersection", inner, { reduced: true })
		)
		// consecutive lengths or Dates have nothing between them
		if (interval instanceof Disjoint) continue
		// an intersection's meta is neither operand's
		intervals.push(
			...(isEmptyObject(branch.meta) ? interval : (
				interval.configure(branch.meta, "self")
			)
			).branches
		)
	}
	return intervals
}

// an object keeps its structure, and so its kind, whatever a key's value narrows to
const withPropValue = (
	branch: Intersection.Node,
	prop: Prop.Node,
	branches: Union.ChildNode[]
): Intersection.Node => {
	const structure = branch.structure!
	return branch.$.node("intersection", {
		...branch.inner,
		structure: branch.$.node("structure", {
			...structure.inner,
			[prop.kind]: structure[prop.kind]!.map(original =>
				original.key === prop.key ?
					branch.$.node(prop.kind, {
						...prop.inner,
						value: branch.$.node("union", { branches }),
						meta: prop.meta
					})
				:	original
			),
			meta: structure.meta
		}),
		meta: branch.meta
	}) as never
}

export type StructuralOperationBranchResultByName = {
	keyof: Union.ChildNode
	pick: Union.ChildNode
	omit: Union.ChildNode
	get: Union.ChildNode
	map: Union.ChildNode
	required: Union.ChildNode
	partial: Union.ChildNode
	merge: Union.ChildNode
	props: array<Prop.Node>
}

export type StructuralOperationName =
	keyof StructuralOperationBranchResultByName

export const writeLiteralUnionEntriesMessage = (expression: string): string =>
	`Props cannot be extracted from a union. Use .distribute to extract props from each branch instead. Received:
${expression}`

export const writeNonStructuralOperandMessage = <
	operation extends StructuralOperationName,
	operand extends string
>(
	operation: operation,
	operand: operand
): writeNonStructuralOperandMessage<operation, operand> =>
	`${operation} operand must be an object (was ${operand})`

export const writeInvalidMergeOperandMessage = <operand extends string>(
	operand: operand
): writeInvalidMergeOperandMessage<operand> =>
	`merge operand must resolve to an object literal type (was ${operand})`

export type writeInvalidMergeOperandMessage<operand extends string> =
	`merge operand must resolve to an object literal type (was ${operand})`

export type writeNonStructuralOperandMessage<
	operation extends StructuralOperationName,
	operand extends string
> = `${operation} operand must be an object (was ${operand})`
