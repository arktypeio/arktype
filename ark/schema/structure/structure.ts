import {
	append,
	conflatenate,
	flatMorph,
	hasOwn,
	nameOf,
	omit,
	printable,
	spliterate,
	throwParseError,
	WeakCache,
	type array,
	type describe,
	type Key,
	type listable,
	type mutable
} from "@ark/util"
import { BaseConstraint } from "../constraint.ts"
import { intrinsic } from "../intrinsic.ts"
import {
	ioOf,
	referencesThroughAliases,
	type BaseNode,
	type GettableKeyOrNode,
	type KeyOrKeyNode
} from "../node.ts"
import type { Morph } from "../roots/morph.ts"
import { typeOrTermExtends, type BaseRoot } from "../roots/root.ts"
import type { BaseScope } from "../scope.ts"
import type { NodeCompiler, TransformStep } from "../shared/compile.ts"
import type {
	attachmentsOf,
	BaseErrorContext,
	BaseNodeInput,
	declareNode
} from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf,
	type StructuralKind
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import {
	copyOf,
	holdsOnlyIndices,
	mergeTransformed,
	TransformErrors
} from "../shared/transform.ts"
import { errorFromContext } from "../shared/errors.ts"
import type { FailureSite, SiteContext } from "../shared/issues.ts"
import {
	addMorphErrors,
	allowsInBranch,
	applyValue,
	transform,
	transformedInApply,
	transformsValid,
	traverseKey,
	type AliasDepth,
	type InternalTraversal,
	type TraversalKind
} from "../shared/traversal.ts"
import {
	composing,
	hasArkKind,
	isNode,
	isResolutionFinal,
	makeRootAndArrayPropertiesMutable
} from "../shared/utils.ts"
import type { Index } from "./index.ts"
import { Optional, type OptionalNode } from "./optional.ts"
import type { Prop } from "./prop.ts"
import type { Required } from "./required.ts"
import type { Sequence } from "./sequence.ts"
import { arrayIndexMatcher, maxArrayLength } from "./shared.ts"

/**
 * - `"ignore"` (default) - allow and preserve extra properties
 * - `"reject"` - disallow extra string keys
 * - `"delete"` - output only declared keys
 */
export type UndeclaredKeyBehavior = "ignore" | UndeclaredKeyHandling

export type UndeclaredKeyHandling = "reject" | "delete"

export interface UndeclaredErrorContext extends BaseErrorContext<"undeclared"> {
	/** the undeclared key's value */
	readonly data: unknown
}

export declare namespace Structure {
	export interface Inner {
		readonly optional?: readonly Optional.Node[]
		readonly required?: readonly Required.Node[]
		readonly index?: readonly Index.Node[]
		readonly sequence?: Sequence.Node
		// "ignore" only where a scope's onUndeclaredKey is another, so a node
		// built from this one's inner doesn't take the scope's
		readonly undeclared?: UndeclaredKeyBehavior
		/**
		 * the order an object built as output lists its declared keys in.
		 * keys it doesn't list follow in canonical order, required first
		 */
		readonly order?: readonly Key[]
	}

	export namespace Inner {
		export type mutable = makeRootAndArrayPropertiesMutable<Inner>
	}

	export interface Input extends Inner, BaseNodeInput {}

	export interface Declaration
		extends declareNode<{
			kind: "structure"
			inner: Inner
			prerequisite: object
			childKind: StructuralKind
		}> {}

	export type Node = StructureNode
}

const createStructuralWriter =
	(childStringProp: "expression" | "description") => (node: StructureNode) => {
		if (node.props.length || node.index) {
			const parts = node.index?.map(index => index[childStringProp]) ?? []
			for (const prop of node.props) parts.push(prop[childStringProp])

			if (node.undeclared) parts.push(`+ (undeclared): ${node.undeclared}`)

			const objectLiteralDescription = `{ ${parts.join(", ")} }`
			return node.sequence ?
					`${objectLiteralDescription} & ${node.sequence.description}`
				:	objectLiteralDescription
		}
		return node.sequence?.description ?? "{}"
	}

const structuralDescription = createStructuralWriter("description")
const structuralExpression = createStructuralWriter("expression")

const implementation: nodeImplementationOf<Structure.Declaration> =
	implementNode<Structure.Declaration>({
		kind: "structure",
		ownsError: false,
		applyConfig: (inner, config) =>
			inner.undeclared === undefined ?
				config.onUndeclaredKey === "ignore" ?
					inner
				:	{ ...inner, undeclared: config.onUndeclaredKey }
			: inner.undeclared === "ignore" && config.onUndeclaredKey === "ignore" ?
				omit(inner, { undeclared: 1 })
			:	inner,
		keys: {
			required: {
				child: true,
				reduceIo: (ioKind, inner, nodes) => {
					// ensure we don't overwrite nodes added by optional
					inner.required = append(
						inner.required,
						nodes!.map(node => ioOf(node, ioKind))
					)
					return
				}
			},
			optional: {
				child: true,
				reduceIo: (ioKind, inner, nodes) => {
					if (ioKind === "in") {
						inner.optional = nodes!.map(node => node.rawIn as OptionalNode)
						return
					}

					// a default's prop is required on output, where it keeps its order
					if (!inner.order && nodes!.some(node => node.hasDefault())) {
						inner.order = conflatenate<Prop.Node>(inner.required, nodes).map(
							node => node.key
						)
					}

					for (const node of nodes!) {
						inner[node.outProp.kind] = append(
							inner[node.outProp.kind],
							node.outProp.rawOut as Prop.Node
						) as never
					}
				}
			},
			index: {
				child: true
			},
			sequence: {
				child: true
			},
			order: {
				unserialized: true
			},
			undeclared: {
				reduceIo: (ioKind, inner, value) => {
					// if base is "delete", undeclared keys are "ignore" (i.e. unconstrained)
					// on input and "reject" on output. "ignore" is explicit so a scope's
					// onUndeclaredKey isn't reapplied to the input.
					inner.undeclared =
						value === "delete" ?
							ioKind === "in" ?
								"ignore"
							:	"reject"
						:	(value as UndeclaredKeyBehavior)
				}
			}
		},
		defaults: {
			description: structuralDescription
		}
	})

const noSiblings: array<BaseConstraint> = []

// whether checking a node can call a function a program supplied,
// which a keyword's predicate isn't
const callsUserCode = (node: BaseNode): boolean =>
	node.hasUserCode ||
	(node.includesAlias &&
		referencesThroughAliases(node.references).some(
			reference => reference.hasUserCode
		))

// what checking a branch costs: 0 compares data itself, 1 reads a
// primitive it points to and 2 walks an object
const branchCost = (branch: BaseRoot): number => {
	const basis = branch.hasKind("intersection") ? branch.basis : branch
	if (basis?.hasKind("unit"))
		return basis.domain === "string" || basis.domain === "bigint" ? 1 : 0
	if (!basis?.hasKind("domain") || basis.domain === "object") return 2
	return basis.domain === "number" ? 0 : 1
}

const allowsRank = (prop: Prop.Node): number =>
	prop.value.includesCostly ?
		3
	:	Math.max(...prop.value.branches.map(branchCost))

// Allows checks cheaper values first, so failing data is rejected sooner,
// though never across a prop calling user code
const orderedForAllows = (props: array<Prop.Node>): array<Prop.Node> => {
	const ordered: Prop.Node[] = []
	let run: Prop.Node[] = []
	const flush = () =>
		ordered.push(...run.sort((l, r) => allowsRank(l) - allowsRank(r)))
	for (const prop of props) {
		if (callsUserCode(prop.value)) {
			flush()
			ordered.push(prop)
			run = []
		} else run.push(prop)
	}
	flush()
	return ordered
}

export class StructureNode extends BaseConstraint<Structure.Declaration> {
	constructor(...args: ConstructorParameters<typeof BaseConstraint>) {
		super(...args)
		// a set engine rejects duplicate keys in order with its other reduce errors
		if (!$ark.sets) {
			const seen: Record<Key, true | undefined> = Object.create(null)
			for (const prop of this.props) {
				if (prop.key in seen)
					throwParseError(writeDuplicateKeyMessage(prop.key))
				seen[prop.key] = true
			}
		}
		this.hasTransform ||= this.structuralMorph !== undefined
	}

	/** how undeclared keys are constrained, if they are */
	get handlesUndeclared(): UndeclaredKeyHandling | undefined {
		return this.undeclared === "ignore" ? undefined : this.undeclared
	}

	// deleting undeclared keys picks them by each signature's Allows
	protected override get selectsByCtx(): boolean {
		return (
			(this.undeclared === "delete" &&
				!!this.index?.some(node => node.signature.hasCtxPredicate)) ||
			super.selectsByCtx
		)
	}

	impliedBasis: BaseRoot = $ark.intrinsic.object.internal
	impliedSiblings: array<BaseConstraint> =
		this.inner.sequence?.impliedSiblings ?? noSiblings

	props: array<Prop.Node> = conflatenate<Prop.Node>(
		this.required,
		this.optional
	)

	private _orderedProps: array<Prop.Node> | undefined
	// props in the order they're checked and an output object lists them
	get orderedProps(): array<Prop.Node> {
		return (this._orderedProps ??=
			this.order ? orderProps(this.props, this.order) : this.props)
	}

	get orderedKeys(): Key[] {
		return this.orderedProps.map(prop => prop.key)
	}

	// a result deleting undeclared keys is a literal of the required props its
	// order starts with, and the others are stored after it in order
	get resultLayout(): [literal: array<Prop.Node>, added: array<Prop.Node>] {
		const props = this.orderedProps
		let i = 0
		while (i < props.length && props[i].required) i++
		return [props.slice(0, i), props.slice(i)]
	}

	// a key it doesn't declare is reported from its site
	override get failureSite(): FailureSite {
		return (this.cache.failureSite ??= {
			v: { code: "undeclared", meta: this.meta } as SiteContext
		}) as FailureSite
	}

	private _allowsProps: array<Prop.Node> | undefined
	get allowsProps(): array<Prop.Node> {
		return (this._allowsProps ??= orderedForAllows(this.orderedProps))
	}

	private _propsByKey: Record<Key, Prop.Node | undefined> | undefined
	get propsByKey(): Record<Key, Prop.Node | undefined> {
		// on a null prototype, "__proto__" is a key and "toString" isn't
		return (this._propsByKey ??= Object.assign(
			Object.create(null),
			Object.fromEntries(this.props.map(node => [node.key, node]))
		))
	}

	get expression(): string {
		return (this.cache.expression ??= composing(() =>
			structuralExpression(this)
		))
	}

	get requiredKeys(): Key[] {
		return this.required?.map(node => node.key) ?? []
	}

	get literalKeys(): Key[] {
		return this.props.map(node => node.key)
	}

	_keyof: BaseRoot | undefined
	keyof(): BaseRoot {
		if (this._keyof) return this._keyof
		let branches = this.$.units(this.literalKeys).branches
		if (this.index) {
			for (const { signature } of this.index)
				branches = branches.concat(signature.branches)
		}
		return (this._keyof = this.$.node("union", { branches }))
	}

	map(flatMapProp: PropFlatMapper): StructureNode {
		return this.$.node(
			"structure",
			this.orderedProps
				.flatMap(flatMapProp)
				.reduce((structureInner: Structure.Inner.mutable, mapped) => {
					const originalProp = this.propsByKey[mapped.key]
					structureInner.order = append(structureInner.order, mapped.key)

					if (isNode(mapped)) {
						if (mapped.kind !== "required" && mapped.kind !== "optional") {
							return throwParseError(
								`Map result must have kind "required" or "optional" (was ${mapped.kind})`
							)
						}

						structureInner[mapped.kind] = append(
							structureInner[mapped.kind] as any,
							mapped
						)
						return structureInner
					}

					const mappedKind = mapped.kind ?? originalProp?.kind ?? "required"

					// extract the inner keys from the map result in case a node was spread,
					// which would otherwise lead to invalid keys
					const mappedPropInner: Prop.Inner = flatMorph(
						mapped as BaseMappedPropInner,
						(k, v) => (k in Optional.implementation.keys ? [k, v] : [])
					) as never

					structureInner[mappedKind] = append(
						structureInner[mappedKind] as any,
						this.$.node(mappedKind, mappedPropInner)
					)

					return structureInner
				}, {})
		)
	}

	assertHasKeys(keys: array<KeyOrKeyNode>): void {
		const invalidKeys = keys.filter(k => !typeOrTermExtends(k, this.keyof()))

		if (invalidKeys.length) {
			return throwParseError(
				writeInvalidKeysMessage(this.expression, invalidKeys)
			)
		}
	}

	get(indexer: GettableKeyOrNode, ...path: array<GettableKeyOrNode>): BaseRoot {
		let value: BaseRoot | undefined
		let required = false

		const key = indexerToKey(indexer)

		if (
			(typeof key === "string" || typeof key === "symbol") &&
			this.propsByKey[key]
		) {
			value = this.propsByKey[key]!.value
			required = this.propsByKey[key]!.required
		}

		if (this.index) {
			for (const n of this.index) {
				if (typeOrTermExtends(key, n.signature))
					value = value?.and(n.value) ?? n.value
			}
		}

		if (
			this.sequence &&
			typeOrTermExtends(key, $ark.intrinsic.nonNegativeIntegerString)
		) {
			if (hasArkKind(key, "root")) {
				if (this.sequence.variadic)
					// if there is a variadic element and we're accessing an index, return a union
					// of all possible elements. If there is no variadic expression, we're in a tuple
					// so this access wouldn't be safe based on the array indices
					value = value?.and(this.sequence.element) ?? this.sequence.element
			} else {
				const index = Number.parseInt(key as string)
				if (index < this.sequence.prevariadic.length) {
					const fixedElement = this.sequence.prevariadic[index].node
					value = value?.and(fixedElement) ?? fixedElement
					required ||= index < this.sequence.prefixLength
				} else if (this.sequence.variadic) {
					// ideally we could return something more specific for postfix
					// but there is no way to represent it using an index alone
					const nonFixedElement = this.$.node("union", {
						branches: this.sequence.variadicOrPostfix
					})
					value = value?.and(nonFixedElement) ?? nonFixedElement
				}
			}
		}

		if (!value) {
			if (
				this.sequence?.variadic &&
				hasArkKind(key, "root") &&
				key.extends($ark.intrinsic.number)
			) {
				return throwParseError(
					writeNumberIndexMessage(key.expression, this.sequence.expression)
				)
			}
			return throwParseError(writeInvalidKeysMessage(this.expression, [key]))
		}

		const result = value.get(...path)
		return required ? result : result.or($ark.intrinsic.undefined)
	}

	pick(...keys: KeyOrKeyNode[]): StructureNode {
		this.assertHasKeys(keys)
		return this.$.node("structure", this.filterKeys("pick", keys))
	}

	omit(...keys: KeyOrKeyNode[]): StructureNode {
		this.assertHasKeys(keys)
		return this.$.node("structure", this.filterKeys("omit", keys))
	}

	// a prop changing kind would move to its kind's canonical place, so these
	// keep the order explicit
	optionalize(): StructureNode {
		const { required, ...inner } = this.inner
		return this.$.node("structure", {
			...inner,
			...(inner.sequence ? { sequence: inner.sequence.optionalize() } : {}),
			optional: this.props.map(prop =>
				prop.hasKind("required") ? this.$.node("optional", prop.inner) : prop
			),
			order: this.orderedKeys
		})
	}

	require(): StructureNode {
		const { optional, ...inner } = this.inner
		return this.$.node("structure", {
			...inner,
			...(inner.sequence ? { sequence: inner.sequence.require() } : {}),
			required: this.props.map(prop =>
				prop.hasKind("optional") ?
					this.$.node("required", { key: prop.key, value: prop.value })
				:	prop
			),
			order: this.orderedKeys
		})
	}

	// as a spread would, keys keep this structure's order and r's new keys follow
	merge(r: StructureNode): StructureNode {
		const inner = this.filterKeys("omit", [r.keyof()])

		if (r.required) inner.required = append(inner.required, r.required)
		if (r.optional) inner.optional = append(inner.optional, r.optional)
		if (r.index) inner.index = append(inner.index, r.index)
		if (r.sequence) inner.sequence = r.sequence
		if (r.undeclared) inner.undeclared = r.undeclared
		else delete inner.undeclared
		inner.order = [...this.orderedKeys, ...r.orderedKeys]
		return this.$.node("structure", inner)
	}

	private filterKeys(
		operation: "pick" | "omit",
		keys: array<BaseRoot | Key>
	): Structure.Inner.mutable {
		const result = makeRootAndArrayPropertiesMutable(this.inner)

		const shouldKeep = (key: KeyOrKeyNode) => {
			const matchesKey = keys.some(k => typeOrTermExtends(key, k))
			return operation === "pick" ? matchesKey : !matchesKey
		}

		if (result.required)
			result.required = result.required.filter(prop => shouldKeep(prop.key))

		if (result.optional)
			result.optional = result.optional.filter(prop => shouldKeep(prop.key))

		if (result.index)
			result.index = result.index.filter(index => shouldKeep(index.signature))

		return result
	}

	traverseAllows(data: object, ctx: InternalTraversal | AliasDepth): boolean {
		return this._traverse("Allows", data, ctx as never)
	}

	traverseApply(data: object, ctx: InternalTraversal): void {
		if (this.sharesTransforms && transformsValid(ctx))
			this.applySharedKeys(data, ctx)
		else this._traverse("Apply", data, ctx)
	}

	protected _traverse(
		traversalKind: TraversalKind,
		data: object,
		ctx: InternalTraversal,
		transformsKeys = true
	): boolean {
		const errorCount = ctx?.currentErrorCount ?? 0
		const props =
			traversalKind === "Allows" ? this.allowsProps : this.orderedProps
		for (let i = 0; i < props.length; i++) {
			const prop = props[i]
			if (traversalKind === "Allows") {
				if (!prop.traverseAllows(data, ctx)) return false
			} else {
				// a prop's Apply would transform before an index signature checks it
				if (transformsKeys) prop.traverseApply(data as never, ctx)
				else if (prop.key in data) {
					traverseKey(
						prop.key,
						() => applyValue(prop.value, data[prop.key as never], ctx, false),
						ctx
					)
				} else if (prop.hasKind("required")) {
					traverseKey(
						prop.key,
						() => ctx.errorFromNode(prop.errorContext, data),
						ctx
					)
				}
				if (ctx.failFast && ctx.currentErrorCount > errorCount) return false
			}
		}

		if (this.sequence) {
			if (traversalKind === "Allows") {
				if (!this.sequence.traverseAllows(data as never, ctx)) return false
			} else {
				this.sequence.traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.currentErrorCount > errorCount) return false
			}
		}

		if (this.index || this.undeclared === "reject") {
			const keys = this.index ? ownKeysOf(data) : Object.keys(data)

			for (let i = 0; i < keys.length; i++) {
				const k = keys[i]

				if (this.index) {
					for (const node of this.index) {
						if (node.allowsKey(k, ctx)) {
							if (traversalKind === "Allows") {
								const result = traverseKey(
									k,
									() => node.value.traverseAllows(data[k as never], ctx),
									ctx
								)
								if (!result) return false
							} else {
								traverseKey(
									k,
									() =>
										applyValue(
											node.value,
											data[k as never],
											ctx,
											transformsKeys
										),
									ctx
								)
								if (ctx.failFast && ctx.currentErrorCount > errorCount)
									return false
							}
						}
					}
				}

				if (
					this.undeclared === "reject" &&
					typeof k === "string" &&
					!this.declaresKey(k)
				) {
					if (traversalKind === "Allows") return false

					errorFromContext(ctx, {
						code: "undeclared",
						relativePath: [k],
						data: data[k as never],
						meta: this.meta
					})

					if (ctx.failFast) return false
				}
			}
		}

		return true
	}

	traverseTransform(data: object, ctx: InternalTraversal): unknown {
		const errorCount = ctx.currentErrorCount
		const copies = !this.writesInto(ctx)
		let out: any = data
		const transformKey = (
			k: Key,
			value: unknown,
			node: BaseNode,
			input = value
		) => {
			let transformed = traverseKey(k, () => transform(ctx, node, input), ctx)
			if (input !== value)
				transformed = mergeTransformed(input, value, transformed)
			if (Object.is(transformed, value)) return value
			if (out === data && copies) out = this.copy(data)
			return (out[k] = transformed)
		}
		const hasIndexedProp = this.hasIndexedProp
		const props = this.orderedProps
		for (let i = 0; i < props.length; i++) {
			const prop = props[i]
			if (!hasIndexedProp) {
				if (prop.value.transforms && prop.key in data)
					transformKey(prop.key, data[prop.key as never], prop.value)
				continue
			}
			if (!(prop.key in data)) continue
			const keyErrorCount = ctx.currentErrorCount
			const input: unknown = data[prop.key as never]
			let value = input
			for (const step of this.transformsOf(prop)) {
				if (ctx.currentErrorCount > keyErrorCount) break
				if (step.signature && !allowsInBranch(ctx, step.signature, prop.key))
					continue
				value = transformKey(
					prop.key,
					value,
					step.node,
					value === input || (step.node as BaseRoot).allows(value) ?
						value
					:	input
				)
			}
		}
		if (this.slicesSequence)
			out = this.sequence!.transformElements(data as array, ctx, true)
		else if (this.sequence?.transforms) {
			const transformedSequence = transform(ctx, this.sequence, data)
			if (transformedSequence !== data)
				out = this.copy(out, transformedSequence as object)
		}
		if (this.index) {
			const keys = ownKeysOf(data)
			for (let i = 0; i < keys.length; i++) {
				const k = keys[i]
				if (hasIndexedProp && k in this.propsByKey) continue
				let input: unknown
				let value: unknown
				let keyErrorCount: number | undefined
				for (const node of this.index) {
					if (!node.value.transforms || !allowsInBranch(ctx, node.signature, k))
						continue
					if (keyErrorCount === undefined) {
						keyErrorCount = ctx.currentErrorCount
						value = input = data[k as never]
					} else if (ctx.currentErrorCount > keyErrorCount) break
					value = transformKey(
						k,
						value,
						node.value,
						value === input || node.value.allows(value) ? value : input
					)
				}
			}
		}
		if (ctx.currentErrorCount > errorCount) return data
		return this.applyStructuralMorph(data, out, ctx)
	}

	// a key several constraints transform, one of which can fail
	get sharesTransforms(): boolean {
		return (
			this.index !== undefined &&
			this.transforms &&
			(this.hasIndexedProp || this.index.length > 1) &&
			(this.props.some(prop => canFailTransforming(prop.value)) ||
				this.index.some(index => canFailTransforming(index.value)))
		)
	}

	// whether traversal continues, as a compiled Apply returns
	applySharedKeys(data: object, ctx: InternalTraversal): boolean {
		const errorCount = ctx.currentErrorCount
		this._traverse("Apply", data, ctx, false)
		for (const prop of this.orderedProps)
			if (prop.key in data) this.transformSharedKey(data, prop.key, ctx)
		for (const k of ownKeysOf(data))
			if (!(k in this.propsByKey)) this.transformSharedKey(data, k, ctx)
		return !ctx.failFast || ctx.currentErrorCount === errorCount
	}

	private transformSharedKey(
		data: object,
		k: Key,
		ctx: InternalTraversal
	): void {
		const prop = this.propsByKey[k]
		if (prop && !this.transformsOf(prop).length) return
		const constraints: BaseNode[] = prop ? [prop.value] : []
		for (const index of this.index!)
			if (allowsInBranch(ctx, index.signature, k)) constraints.push(index.value)
		const steps: TransformStep[] =
			prop ?
				this.transformsOf(prop)
			:	constraints.filter(n => n.transforms).map(node => ({ node }))
		const input: unknown = data[k as never]
		if (
			!steps.length ||
			!traverseKey(
				k,
				() => constraints.every(n => allowsInBranch(ctx, n, input)),
				ctx
			)
		)
			return
		const errorCount = ctx.currentErrorCount
		let value = input
		for (const step of steps) {
			if (ctx.currentErrorCount > errorCount) break
			if (step.signature && !allowsInBranch(ctx, step.signature, k)) continue
			const stepInput =
				value === input || step.node.allows(value) ? value : input
			const transformed = traverseKey(
				k,
				() => transform(ctx, step.node, stepInput),
				ctx
			)
			value =
				stepInput === value ? transformed : (
					mergeTransformed(stepInput, value, transformed)
				)
		}
		transformedInApply(ctx, value)
	}

	applyStructuralMorph(
		data: object,
		out: object,
		ctx: InternalTraversal | undefined
	): object | TransformErrors {
		const sliced = out !== data && this.slicesSequence
		let failed: TransformErrors | undefined
		for (let i = 0; i < this.defaultable.length; i++) {
			if (!this.defaultable[i].holdsValue(data)) {
				if (out === data && !this.writesInto(ctx)) out = this.copy(data)
				const defaulted = this.defaultable[i].defaultMorph(
					out as never,
					ctx as never
				)
				if (defaulted instanceof TransformErrors)
					failed = defaulted.addTo(failed)
			}
		}
		const sequence = this.sequence
		if (
			sequence?.defaultables &&
			(data as array).length < sequence.prefixLength + sequence.defaultableCount
		) {
			if (out === data && !this.writesInto(ctx)) out = this.copy(data)
			for (
				let i = (data as array).length - sequence.prefixLength;
				i < sequence.defaultables.length;
				i++
			) {
				const defaulted = sequence.defaultMorphs[i](out as never, ctx as never)
				if (defaulted instanceof TransformErrors)
					failed = defaulted.addTo(failed)
			}
		}
		if (failed) {
			// a transform without ctx returns its errors
			if (!ctx) return failed
			addMorphErrors(ctx, failed)
		}
		// an object's copy drops a declared key data holds as a non-enumerable own prop
		if (out !== data && !sequence) {
			for (const prop of this.orderedProps) {
				if (!(prop.key in out) && prop.key in data)
					out[prop.key as never] = data[prop.key as never]
			}
			for (const prop of this.inheritableProps) {
				if (!hasOwn(out, prop.key) && hasOwn(data, prop.key))
					out[prop.key as never] = data[prop.key as never]
			}
		}
		if (this.undeclared !== "delete" || sliced) return out
		// assigning "__proto__" to a built result would set its prototype
		if (
			Object.getPrototypeOf(out) !== Object.prototype ||
			hasOwn(out, "__proto__")
		) {
			const undeclaredKeys = ownKeysOf(data).filter(k => !this.declaresKey(k))
			if (!undeclaredKeys.length) return out
			if (out === data) out = this.copy(data)
			for (const k of undeclaredKeys) delete out[k as never]
			return out
		}
		const result: Record<Key, unknown> = {}
		for (const prop of this.orderedProps)
			if (prop.key in out) result[prop.key] = out[prop.key as never]
		for (const prop of this.inheritableProps) {
			if (!this.transformsOf(prop).length && !hasOwn(data, prop.key))
				delete result[prop.key]
		}
		if (this.index) {
			for (const k of ownKeysOf(out)) {
				if (!(k in this.propsByKey) && this.declaresKey(k))
					result[k] = out[k as never]
			}
		}
		return result
	}

	// a structure deleting undeclared keys copies what it writes
	private writesInto(ctx: { inPlace?: boolean } | undefined): boolean {
		return !!ctx?.inPlace && this.undeclared !== "delete"
	}

	private copy(data: object, copy = copyOf(data)): object {
		if (this.sequence) {
			for (const prop of this.orderedProps)
				if (prop.key in data) copy[prop.key as never] = data[prop.key as never]
		}
		return copy
	}

	readonly inheritableProps: Prop.Node[] = this.props.filter(
		prop => prop.key in Object.prototype
	)

	private _hasIndexedProp: boolean | undefined
	get hasIndexedProp(): boolean {
		return (this._hasIndexedProp ??=
			this.index !== undefined &&
			this.props.some(prop =>
				this.index!.some(
					index =>
						index.signature.allowsNeedsCtx || index.signature.allows(prop.key)
				)
			))
	}

	private _transformsByKey: Record<Key, TransformStep[]> | undefined
	transformsOf(prop: Prop.Node): TransformStep[] {
		const cached = this._transformsByKey?.[prop.key]
		if (cached) return cached
		const transforms: TransformStep[] =
			prop.value.transforms ? [{ node: prop.value }] : []
		if (!this.index) return transforms
		for (const index of this.index) {
			if (!index.value.transforms || index.value === prop.value) continue
			if (index.signature.allowsNeedsCtx)
				transforms.push({ node: index.value, signature: index.signature })
			else if (index.signature.allows(prop.key))
				transforms.push({ node: index.value })
		}
		if (!isResolutionFinal()) return transforms
		return ((this._transformsByKey ??= Object.create(null))[prop.key] =
			transforms)
	}

	// in order, so data missing several gets them as declared
	readonly defaultable: Optional.Node.withDefault[] =
		this.optional?.some(prop => prop.hasDefault()) ?
			(this.orderedProps.filter(prop =>
				prop.hasDefault()
			) as Optional.Node.withDefault[])
		:	[]

	declaresKey = (k: Key): boolean =>
		k in this.propsByKey ||
		this.index?.some(n => n.signature.allows(k)) ||
		(this.sequence !== undefined &&
			typeof k === "string" &&
			arrayIndexMatcher.test(k) &&
			+k < maxArrayLength)

	_compileDeclaresKey(js: NodeCompiler): string {
		const parts: string[] = []
		if (this.index) {
			for (const index of this.index)
				parts.push(js.allows(index.signature, "k"))
		}

		if (this.sequence) {
			parts.push(
				`typeof k === "string" && ${js.ref(arrayIndexMatcher)}.test(k) && +k < ${maxArrayLength}`
			)
		}

		// if parts is empty, this is a structure like { "+": "reject" }
		// that declares no keys other than its props, so return false
		return parts.join(" || ") || "false"
	}

	// copied by slice: declares only indices and no cycle runs through it
	get slicesSequence(): boolean {
		return (
			this.undeclared === "delete" &&
			!this.props.length &&
			!this.index &&
			!!this.sequence?.transforms &&
			!this.sequence.includesAlias
		)
	}

	readonly structuralMorph: Morph | undefined = getPossibleMorph(this)

	compile(js: NodeCompiler): unknown {
		if (js.traversalKind === "Transform") return this.compileTransform(js)
		if (js.traversalKind === "Apply" && this.sharesTransforms) {
			js.if(`${js.ref(transformsValid)}(ctx)`, () =>
				js.return(`${js.ref(this)}.applySharedKeys(data, ctx)`)
			)
		}

		const conjunction =
			js.traversalKind === "Apply" ? this.compileConjunction(js) : undefined
		if (conjunction !== undefined) return js.return(conjunction)

		for (const prop of this.propsOf(js)) js.check(prop)

		if (this.sequence) js.check(this.sequence)

		if (this.index) {
			js.const("keys", "Object.keys(data)").for("i < keys.length", () =>
				this.compileEntry(js.const("k", "keys[i]"), "string")
			)
			if (this.indexMatchesSymbols) {
				js.loop("for (const k of Object.getOwnPropertySymbols(data))", () =>
					this.compileEntry(js, "symbol")
				)
			}
		} else if (this.undeclared === "reject") {
			if (js.traversalKind === "Allows" && js.jsonInput && this.countsKeys)
				this.compileKeyCount(js, () => js.return(true))
			js.forIn("data", () => this.compileEntry(js, "string"))
		}

		return js.return(true)
	}

	// whether data of only own, enumerable keys holds none it doesn't declare
	// where for...in finds as many keys as it holds declared ones: not where it
	// declares a key Object.prototype has, which in finds even unheld
	get countsKeys(): boolean {
		return (
			!this.index &&
			!this.sequence &&
			this.props.every(
				prop => typeof prop.key === "string" && !(prop.key in Object.prototype)
			)
		)
	}

	// on a plain object, onCount where its key count is that of the declared
	// keys it holds
	private compileKeyCount(js: NodeCompiler, onCount: () => NodeCompiler): void {
		const held = [
			`${this.required?.length ?? 0}`,
			...(this.optional ?? []).map(
				prop => `+(${js.serialize(prop.key)} in data)`
			)
		]
		js.if("Object.getPrototypeOf(data) === Object.prototype", () =>
			js
				.let("n", 0)
				.loop("for (const k in data)", () => js.line("n++"))
				.if(`n === ${held.join(" + ")}`, onCount)
		)
	}

	// an Apply reporting one issue checks props as Allows does, stopping where
	// it did
	private propsOf(js: NodeCompiler): array<Prop.Node> {
		return js.traversalKind === "Allows" || js.reportsFirst ?
				this.allowsProps
			:	this.orderedProps
	}

	// a structure with nothing to loop over holds only while each child does
	compileConjunction(js: NodeCompiler): string | undefined {
		if (
			js.traversalKind === "Transform" ||
			this.index ||
			this.undeclared === "reject"
		)
			return
		const children = [
			...this.propsOf(js),
			...(this.sequence ? [this.sequence] : [])
		]
		return children.map(child => js.invoke(child)).join(" && ") || "true"
	}

	private compileTransform(js: NodeCompiler): void {
		const transformedProps = this.orderedProps.filter(
			prop => this.transformsOf(prop).length
		)
		const transformedIndex =
			this.index?.filter(index => index.value.transforms) ?? []
		const deletes = this.undeclared === "delete"
		const transformedChildren = transformedProps.flatMap(prop =>
			this.transformsOf(prop).map(step => step.node)
		)
		for (const index of transformedIndex) transformedChildren.push(index.value)
		if (this.sequence?.transforms) transformedChildren.push(this.sequence)
		transformedChildren.push(...this.defaultable)
		js.initializeTransform(transformedChildren, this)
		js.let("out", "data")
		// a lone site nothing after can fail completes its copy itself
		const once =
			transformedChildren.length === 1 &&
			transformedProps.length === 1 &&
			!js.requiresContext
		for (let i = 0; i < transformedProps.length; i++) {
			const { key, optional } = transformedProps[i]
			const keyExpression = js.serialize(key)
			const onChange = () => {
				this.compileCopy(js, i === 0).line(
					`out${js.prop(key)} = transformed${i}`
				)
				if (once) this.compileDeclaredCopy(js, [key])
			}
			js.const(`value${i}`, `data${js.prop(key)}`).transformKey(
				`transformed${i}`,
				`value${i}`,
				this.transformsOf(transformedProps[i]),
				{
					keyExpression,
					...(optional ? { condition: `${keyExpression} in data` } : {}),
					...(deletes ? {} : { onChange })
				}
			)
		}
		if (this.slicesSequence) this.sequence!.compileElementTransforms(js, true)
		else if (this.sequence?.transforms) {
			js.transformKey(
				"transformedSequence",
				"data",
				[{ node: this.sequence }],
				{
					onChange: () =>
						this.compileCopyProps(js, "out", "transformedSequence").set(
							"out",
							"transformedSequence"
						)
				}
			)
		}
		if (transformedIndex.length) {
			this.compileForOwnKeys(js, "data", () => {
				if (this.hasIndexedProp)
					js.if(`k in ${js.ref(this.propsByKey)}`, () => js.line("continue"))
				const transformKey = (steps: TransformStep[]) =>
					js
						.const("value", "data[k]")
						.transformKey("transformed", "value", steps, {
							keyExpression: "k",
							onChange: () => this.compileCopy(js).line("out[k] = transformed")
						})
				if (transformedIndex.length === 1) {
					return js.if(
						js.invoke(transformedIndex[0].signature, {
							arg: "k",
							kind: "Allows"
						}),
						() => transformKey([{ node: transformedIndex[0].value }])
					)
				}
				return transformKey(
					transformedIndex.map(index => ({
						node: index.value,
						signature: index.signature
					}))
				)
			})
		}
		js.returnIfFailed()
		if (deletes) {
			return this.compileDeleteTransform(
				js,
				transformedProps,
				this.sequence?.transforms || transformedIndex.length !== 0
			)
		}
		this.compileDefaults(
			js,
			transformedChildren.length === this.defaultable.length
		)
		if (!once) this.compileDeclaredCopy(js)
		js.return("out")
	}

	private compileDefaults(js: NodeCompiler, first?: boolean): NodeCompiler {
		// a default can fail, but where none is written, the check before stands
		if (!this.defaultable.length && !this.sequence?.defaultables) return js
		for (const node of this.defaultable) {
			js.if(`!(${node.compileHoldsValue(js, "data")})`, () =>
				compileDefault(this.compileCopy(js, first), node, "out")
			)
			first = false
		}
		this.compileSequenceDefaults(js)
		return js.returnIfFailed()
	}

	// out is data at the first site and where a transform writes in place
	private compileCopy(js: NodeCompiler, first?: boolean): NodeCompiler {
		if (this.writesInto(js)) return js
		const copy = () =>
			this.sequence ?
				this.compileCopyProps(
					js.set("out", `${js.ref(copyOf)}(data)`),
					"data",
					"out"
				)
			:	js.set(
					"out",
					`${this.compileShapeCheck(js)}Object.getPrototypeOf(data) === Object.prototype ? { ...data } : ${js.ref(copyOf)}(data)`
				)
		return first ? copy() : js.if("out === data", copy)
	}

	// read a required key first; copyOf handles data without it
	compileShapeCheck(js: NodeCompiler): string {
		return this.required ?
				`${js.serialize(this.required[0].key)} in data && `
			:	""
	}

	compileDeclaredCopy(js: NodeCompiler, written?: Key[]): NodeCompiler {
		if (this.sequence || this.writesInto(js)) return js
		const copyKeys = () => {
			for (const prop of this.orderedProps) {
				if (written?.includes(prop.key)) continue
				const missing = `!(${js.serialize(prop.key)} in out)`
				js.if(
					prop.required ? missing : (
						`${missing} && ${js.serialize(prop.key)} in data`
					),
					() => js.line(`out${js.prop(prop.key)} = data${js.prop(prop.key)}`)
				)
			}
			for (const prop of this.inheritableProps) {
				js.if(
					`!Object.prototype.hasOwnProperty.call(out, ${js.serialize(prop.key)}) && Object.prototype.hasOwnProperty.call(data, ${js.serialize(prop.key)})`,
					() => js.line(`out${js.prop(prop.key)} = data${js.prop(prop.key)}`)
				)
			}
			return js
		}
		return written === undefined ? js.if("out !== data", copyKeys) : copyKeys()
	}

	// an array's copy has only the enumerable props of data
	private compileCopyProps(
		js: NodeCompiler,
		from: string,
		to: string
	): NodeCompiler {
		for (const prop of this.orderedProps) {
			const store = `${to}${js.prop(prop.key)} = ${from}${js.prop(prop.key)}`
			if (prop.required) js.line(store)
			else js.if(`${js.serialize(prop.key)} in data`, () => js.line(store))
		}
		return js
	}

	private compileSequenceDefaults(js: NodeCompiler): void {
		const sequence = this.sequence
		if (!sequence?.defaultables) return
		const defaultables = sequence.defaultables
		js.if(
			`data.length < ${sequence.prefixLength + sequence.defaultableCount}`,
			() => {
				this.compileCopy(js)
				for (let i = 0; i < defaultables.length; i++) {
					const [node, defaultValue] = defaultables[i]
					const index = sequence.prefixLength + i
					const morph = sequence.defaultMorphs[i]
					js.if(`data.length <= ${index}`, () =>
						typeof defaultValue !== "function" && !node.transforms ?
							js.line(`out[${index}] = ${serializeDefault(js, defaultValue)}`)
						:	compileDefaultMorph(
								js,
								sequence,
								`${js.ref(morph)}(out${morph.length === 2 ? ", ctx" : ""})`,
								"out"
							)
					)
				}
				return js
			}
		)
	}

	private compileDeleteTransform(
		js: NodeCompiler,
		transformedProps: Prop.Node[],
		outMayBeCopied: boolean
	): void {
		const deleteFromCopy = (js: NodeCompiler) => {
			for (let i = 0; i < transformedProps.length; i++) {
				const prop = transformedProps[i]
				const changed = js.compareTransformed(
					this.transformsOf(prop),
					`transformed${i}`,
					"!==",
					`value${i}`
				)
				js.if(changed, () =>
					this.compileCopy(js).line(`out${js.prop(prop.key)} = transformed${i}`)
				)
			}
			this.compileDefaults(js)
			// out can differ from data only after a transform or a default
			if (outMayBeCopied || transformedProps.length || this.defaultable.length)
				this.compileDeclaredCopy(js)
			const deletes = () =>
				this.compileForOwnKeys(
					js,
					"data",
					() =>
						js.if(
							`!(k in ${js.ref(this.propsByKey)}) && !(${this._compileDeclaresKey(js)})`,
							() => this.compileCopy(js).line("delete out[k]")
						),
					"dataKeys",
					"dataSymbols",
					true
				)
			if (this.sequence) js.if("!indexed", deletes)
			else deletes()
			return js.return("out")
		}
		if (this.sequence) {
			// only an array with non-index keys is scanned for undeclared ones
			js.const(
				"indexed",
				`${this.slicesSequence ? "out !== data || " : ""}${js.ref(holdsOnlyIndices)}(data)`
			)
			const unchanged = ["indexed"]
			if (outMayBeCopied) unchanged.push("out === data")
			for (let i = 0; i < transformedProps.length; i++) {
				unchanged.push(
					js.compareTransformed(
						this.transformsOf(transformedProps[i]),
						`transformed${i}`,
						"===",
						`value${i}`
					)
				)
			}
			for (const node of this.defaultable)
				unchanged.push(node.compileHoldsValue(js, "data"))
			if (this.sequence.defaultables) {
				unchanged.push(
					`data.length >= ${this.sequence.prefixLength + this.sequence.defaultableCount}`
				)
			}
			js.if(unchanged.join(" && "), () => js.return("data"))
			deleteFromCopy(js)
			return
		}
		const outputOf = (prop: Prop.Node) => {
			const i = transformedProps.indexOf(prop)
			return i === -1 ? `out${js.prop(prop.key)}` : `transformed${i}`
		}
		const [literal, added] = this.resultLayout
		const literalOf = (valueOf: (prop: Prop.Node) => string) =>
			`{ ${literal.map(prop => `${typeof prop.key === "symbol" ? `[${js.ref(prop.key)}]` : prop.serializedKey}: ${valueOf(prop)}`).join(", ")} }`
		// a literal's __proto__ is its prototype, which null would make null
		if (js.copiesValues || this.declaresKey("__proto__"))
			js.const("result", literalOf(outputOf))
		else {
			js.const(
				"result",
				literalOf(() => "null")
			)
			for (const prop of literal)
				js.line(`result${js.prop(prop.key)} = ${outputOf(prop)}`)
		}
		const copies =
			this.declaresKey("__proto__") ?
				`Object.getPrototypeOf(data) !== Object.prototype || Object.prototype.hasOwnProperty.call(data, "__proto__")`
			:	"Object.getPrototypeOf(data) !== Object.prototype"
		// checked after the literal's reads
		js.if(copies, () =>
			js.outline(
				`${js.nameOf(this.id)}Copy`,
				[
					"out",
					...transformedProps.flatMap((_, i) => [
						`value${i}`,
						`transformed${i}`
					])
				],
				deleteFromCopy
			)
		)
		for (const prop of added) {
			const store = () =>
				js.line(`result${js.prop(prop.key)} = ${outputOf(prop)}`)
			if (prop.hasKind("required")) store()
			else {
				js.if(prop.compileHoldsValue(js, "data"), store)
				if (prop.hasDefault()) js.else(() => compileDefault(js, prop, "result"))
			}
		}
		for (const prop of this.inheritableProps) {
			if (transformedProps.includes(prop)) continue
			js.if(
				`!Object.prototype.hasOwnProperty.call(data, ${js.serialize(prop.key)})`,
				() => js.line(`delete result${js.prop(prop.key)}`)
			)
		}
		if (this.index) {
			this.compileForOwnKeys(
				js,
				"out",
				() =>
					js.if(
						`!(k in ${js.ref(this.propsByKey)}) && (${this._compileDeclaresKey(js)})`,
						() => js.line("result[k] = out[k]")
					),
				"outKeys",
				"outSymbols"
			)
		}
		js.returnIfFailed().return("result")
	}

	// without a set engine, any signature may match a symbol key
	private get indexMatchesSymbols(): boolean {
		return !!this.index?.some(
			node => !$ark.sets || !node.signature.extends($ark.intrinsic.string)
		)
	}

	// loops k over the own keys of object
	private compileForOwnKeys(
		js: NodeCompiler,
		object: string,
		body: () => NodeCompiler,
		keys = "keys",
		symbols = "symbols",
		withSymbols = this.indexMatchesSymbols
	): NodeCompiler {
		js.const(keys, `Object.keys(${object})`)
		if (withSymbols) {
			js.const(symbols, `Object.getOwnPropertySymbols(${object})`).if(
				`${symbols}.length`,
				() => js.line(`${keys}.push(...${symbols})`)
			)
		}
		return js.for(`i < ${keys}.length`, () => {
			js.const("k", `${keys}[i]`)
			return body()
		})
	}

	protected compileEntry(
		js: NodeCompiler,
		keyDomain: "string" | "symbol"
	): NodeCompiler {
		if (this.index) {
			for (const node of this.index) {
				js.if(js.allows(node.signature, "k"), () =>
					js.traverseKey("k", "data[k]", node.value)
				)
			}
		}

		if (this.undeclared === "reject" && keyDomain === "string") {
			// for...in also reaches inherited keys, which aren't undeclared
			const isOwn = "Object.prototype.hasOwnProperty.call(data, k)"
			const skipsInherited =
				!this.index && !this.sequence && js.traversalKind === "Allows"
			if (skipsInherited) js.line(`if (!${isOwn}) continue`)
			const props = this.props.filter(prop => typeof prop.key === keyDomain)
			if (props.length) compileDeclaredKeySwitch(js, props)
			const reject = () =>
				js.traversalKind === "Allows" ?
					js.return(false)
				:	js.if(js.undeclaredFails?.(this) ?? js.error(this, "k"), () =>
						js.return(false)
					)
			const declaresKey = this._compileDeclaresKey(js)
			const conditions = declaresKey === "false" ? [] : [`!(${declaresKey})`]
			if (!this.index && !skipsInherited) conditions.push(isOwn)
			if (conditions.length) js.if(conditions.join(" && "), reject)
			else reject()
		}

		return js
	}
}

const defaultableMorphsCache = new WeakCache<Morph>()

type PartiallyInitializedStructure = attachmentsOf<Structure.Declaration> &
	Pick<Structure.Node, "defaultable" | "declaresKey" | "orderedProps">

const constructStructuralMorphCacheKey = (
	node: PartiallyInitializedStructure
): string => {
	let cacheKey = ""

	// nameOf names each morph uniquely without registering, which would keep it alive
	for (let i = 0; i < node.defaultable.length; i++)
		cacheKey += `${nameOf(node.defaultable[i].defaultMorph)} `

	if (node.sequence?.defaultMorphs.length)
		cacheKey += `${nameOf(node.sequence.defaultMorphs)} `

	if (node.undeclared === "delete") {
		cacheKey += "delete !("
		// in the order its result lists them
		for (const n of node.orderedProps) cacheKey += n.serializedKey + " | "
		if (node.index)
			for (const index of node.index) cacheKey += index.signature.id + " | "
		if (node.sequence) {
			if (node.sequence.maxLength === null)
				cacheKey += intrinsic.nonNegativeIntegerString.id
			else {
				for (let i = 0; i < node.sequence.tuple.length; i++)
					cacheKey += i + " | "
			}
		}
		cacheKey += ")"
	}

	return cacheKey
}

const getPossibleMorph = (
	node: PartiallyInitializedStructure
): Morph | undefined => {
	const cacheKey = constructStructuralMorphCacheKey(node)
	if (!cacheKey) return undefined

	const cached = defaultableMorphsCache.get(cacheKey)
	if (cached) return cached

	const $arkStructuralMorph: Morph<any> = (data, ctx) =>
		(node as Structure.Node).applyStructuralMorph(data, data, ctx)

	return defaultableMorphsCache.set(cacheKey, $arkStructuralMorph)
}

export const compileDefault = (
	js: NodeCompiler,
	node: Optional.Node.withDefault,
	out: string
): NodeCompiler => {
	if (typeof node.default !== "function" && !node.value.transforms) {
		return js.line(
			`${out}${js.prop(node.key)} = ${serializeDefault(js, node.default)}`
		)
	}
	return compileDefaultMorph(
		js,
		node,
		`${js.ref(node.defaultMorph)}(${out}${node.defaultMorph.length === 2 ? ", ctx" : ""})`,
		out
	)
}

// -0 would serialize as 0
const serializeDefault = (js: NodeCompiler, value: unknown): string =>
	Object.is(value, -0) ? "-0" : js.serialize(value)

// a morph or a transform reading ctx can add errors
const canFailTransforming = (node: BaseNode): boolean =>
	node.includesMorph || node.transformNeedsCtx

// only a default on a node that includesMorph can return TransformErrors
const compileDefaultMorph = (
	js: NodeCompiler,
	node: BaseNode,
	call: string,
	out: string
): NodeCompiler =>
	node.includesMorph ?
		js
			.const("defaulted", call)
			.if(`defaulted !== ${out}`, () => js.addMorphErrors("defaulted"))
	:	js.line(call)

const compileDeclaredKeySwitch = (
	js: NodeCompiler,
	props: Prop.Node[]
): NodeCompiler =>
	js.block("switch (k)", () =>
		js.line(
			`${props.map(prop => `case ${js.serialize(prop.key)}:`).join(" ")} continue`
		)
	)

// the props order lists, as it lists them, then the rest as they were
const orderProps = (
	props: array<Prop.Node>,
	order: readonly Key[]
): Prop.Node[] => {
	const ordered: Prop.Node[] = []
	for (const k of order) {
		const prop = props.find(prop => prop.key === k)
		if (prop && !ordered.includes(prop)) ordered.push(prop)
	}
	if (ordered.length < props.length)
		for (const prop of props) if (!ordered.includes(prop)) ordered.push(prop)
	return ordered
}

// an order listing the props as they're sorted is dropped, so a structure
// declared that way is the one built without an order
export const normalizeOrder = (inner: mutable<Structure.Inner>): void => {
	const required = inner.required ?? []
	const optional = inner.optional ?? []
	if (
		inner.order?.length === required.length + optional.length &&
		inner.order.every(
			(k, i) =>
				k ===
				(i < required.length ? required[i] : optional[i - required.length]).key
		)
	)
		delete inner.order
}

export const ownKeysOf = (data: object): Key[] => {
	const keys: Key[] = Object.keys(data)
	const symbols = Object.getOwnPropertySymbols(data)
	if (symbols.length) keys.push(...symbols)
	return keys
}

export type PropFlatMapper = (entry: Prop.Node) => listable<MappedPropInner>

export type MappedPropInner = BaseMappedPropInner | OptionalMappedPropInner

// this assumes the props on Required.Inner are a subset of those on Optional.Inner
export interface BaseMappedPropInner extends Required.Inner {
	kind?: "required" | "optional"
}

export interface OptionalMappedPropInner extends Optional.Inner {
	kind: "optional"
}

export const Structure = {
	implementation,
	Node: StructureNode
}

const indexerToKey = (indexable: GettableKeyOrNode): KeyOrKeyNode => {
	if (hasArkKind(indexable, "root") && indexable.hasKind("unit"))
		indexable = indexable.unit as Key
	if (typeof indexable === "number") indexable = `${indexable}`
	return indexable
}

export const writeNumberIndexMessage = (
	indexExpression: string,
	sequenceExpression: string
): string =>
	`${indexExpression} is not allowed as an array index on ${sequenceExpression}. Use the 'nonNegativeIntegerString' keyword instead.`

export type NormalizedIndex = {
	index?: Index.Node
	required?: Required.Node[]
	optional?: Optional.Node[]
}

/** extract enumerable named props from an index signature */
export const normalizeIndex = (
	signature: BaseRoot,
	value: BaseRoot,
	$: BaseScope
): NormalizedIndex => {
	const [enumerableBranches, nonEnumerableBranches] = spliterate(
		signature.branches,
		k => k.hasKind("unit")
	)

	if (!enumerableBranches.length) {
		return {
			index: $.node("index", { signature: signature as Index.KeyNode, value })
		}
	}

	const normalized: NormalizedIndex = {}

	for (const n of enumerableBranches) {
		// since required can be reduced to optional if it has a default or
		// optional meta on its value, we have to assign it depending on the
		// compiled kind
		const prop = $.node("required", { key: n.unit as Key, value })
		normalized[prop.kind] = append(normalized[prop.kind], prop as never)
	}

	if (nonEnumerableBranches.length) {
		normalized.index = $.node("index", {
			signature: $.node("union", {
				branches: nonEnumerableBranches
			}) as Index.KeyNode,
			value
		})
	}

	return normalized
}

export const typeKeyToString = (k: KeyOrKeyNode): string =>
	hasArkKind(k, "root") ? k.expression : printable(k)

export const writeInvalidKeysMessage = <
	o extends string,
	keys extends array<KeyOrKeyNode>
>(
	o: o,
	keys: keys
): string =>
	`Key${keys.length === 1 ? "" : "s"} ${keys.map(typeKeyToString).join(", ")} ${keys.length === 1 ? "does" : "do"} not exist on ${o}`

export const writeDuplicateKeyMessage = <key extends Key>(
	key: key
): writeDuplicateKeyMessage<key> => `Duplicate key ${printable(key) as never}`

export type writeDuplicateKeyMessage<key extends Key> =
	`Duplicate key '${describe<key>}'`
