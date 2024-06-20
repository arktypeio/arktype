import {
	append,
	cached,
	flatMorph,
	printable,
	registeredReference,
	spliterate,
	throwParseError,
	type array,
	type Key,
	type RegisteredReference
} from "@arktype/util"
import {
	BaseConstraint,
	constraintKeyParser,
	flattenConstraints,
	intersectConstraints
} from "../constraint.js"
import type { MutableInner } from "../kinds.js"
import type { TypeKey, TypePath } from "../node.js"
import type { BaseRoot } from "../roots/root.js"
import type { RawRootScope } from "../scope.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf,
	type StructuralKind
} from "../shared/implement.js"
import { intersectNodesRoot } from "../shared/intersections.js"
import type {
	TraversalContext,
	TraversalKind,
	TraverseAllows,
	TraverseApply
} from "../shared/traversal.js"
import {
	hasArkKind,
	makeRootAndArrayPropertiesMutable
} from "../shared/utils.js"
import type { IndexNode, IndexSchema } from "./indexed.js"
import type { OptionalNode, OptionalSchema } from "./optional.js"
import type { PropNode } from "./prop.js"
import type { RequiredNode, RequiredSchema } from "./required.js"
import type { SequenceNode, SequenceSchema } from "./sequence.js"
import { arrayIndexMatcher, arrayIndexMatcherReference } from "./shared.js"

export type UndeclaredKeyBehavior = "ignore" | UndeclaredKeyHandling

export type UndeclaredKeyHandling = "reject" | "delete"

export interface StructureSchema extends BaseMeta {
	readonly optional?: readonly OptionalSchema[]
	readonly required?: readonly RequiredSchema[]
	readonly index?: readonly IndexSchema[]
	readonly sequence?: SequenceSchema
	readonly undeclared?: UndeclaredKeyBehavior
}

export interface StructureInner extends BaseMeta {
	readonly optional?: readonly OptionalNode[]
	readonly required?: readonly RequiredNode[]
	readonly index?: readonly IndexNode[]
	readonly sequence?: SequenceNode
	readonly undeclared?: UndeclaredKeyHandling
}

export interface StructureDeclaration
	extends declareNode<{
		kind: "structure"
		schema: StructureSchema
		normalizedSchema: StructureSchema
		inner: StructureInner
		prerequisite: object
		childKind: StructuralKind
	}> {}

export class StructureNode extends BaseConstraint<StructureDeclaration> {
	impliedBasis: BaseRoot = $ark.intrinsic.object
	impliedSiblings = this.children.flatMap(
		n => (n.impliedSiblings as BaseConstraint[]) ?? []
	)

	props: array<PropNode> =
		this.required ?
			this.optional ?
				[...this.required, ...this.optional]
			:	this.required
		:	this.optional ?? []

	propsByKey: Record<Key, PropNode | undefined> = flatMorph(
		this.props,
		(i, node) => [node.key, node] as const
	)

	propsByKeyReference: RegisteredReference = registeredReference(
		this.propsByKey
	)

	expression: string = structuralExpression(this)

	requiredLiteralKeys: Key[] = this.required?.map(node => node.key) ?? []

	optionalLiteralKeys: Key[] = this.optional?.map(node => node.key) ?? []

	literalKeys: Key[] = [
		...this.requiredLiteralKeys,
		...this.optionalLiteralKeys
	]

	@cached
	keyof(): BaseRoot {
		let branches = this.$.units(this.literalKeys).branches
		this.index?.forEach(({ signature }) => {
			branches = branches.concat(signature.branches)
		})
		return this.$.node("union", branches)
	}

	get(key: TypeKey, ...tail: TypePath): BaseRoot {
		let value: BaseRoot | undefined
		let literalKey: Key | undefined
		let required = false

		if (hasArkKind(key, "root") && key.hasKind("unit")) key = key.unit as never

		if (typeof key === "string" || typeof key === "symbol") literalKey = key
		else if (typeof key === "number") literalKey = `${key}`

		if (literalKey && this.propsByKey[literalKey]) {
			value = this.propsByKey[literalKey]!.value
			required = this.propsByKey[literalKey]!.required
		}

		this.index?.forEach(n => {
			if (n.signature.includes(key)) value = value?.and(n.value) ?? n.value
		})

		if (!value)
			return throwParseError(`${printable(key)} does not exist on ${this}`)

		const result = value.get(...tail)
		return required ? result.or($ark.intrinsic.undefined) : result
	}

	readonly exhaustive: boolean =
		this.undeclared !== undefined || this.index !== undefined

	omit(...keys: array<BaseRoot | Key>): StructureNode {
		return this.$.node("structure", omitFromInner(this.inner, keys))
	}

	merge(r: StructureNode): StructureNode {
		const inner = makeRootAndArrayPropertiesMutable(
			omitFromInner(this.inner, [r.keyof()])
		)
		if (r.required) inner.required = append(inner.required, r.required)
		if (r.optional) inner.optional = append(inner.optional, r.optional)
		if (r.index) inner.index = append(inner.index, r.index)
		if (r.sequence) inner.sequence = r.sequence
		if (r.undeclared) inner.undeclared = r.undeclared
		else delete inner.undeclared
		return this.$.node("structure", inner)
	}

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		this._traverse("Allows", data, ctx)

	traverseApply: TraverseApply<object> = (data, ctx) =>
		this._traverse("Apply", data, ctx)

	protected _traverse = (
		traversalKind: TraversalKind,
		data: object,
		ctx: TraversalContext
	): boolean => {
		const errorCount = ctx?.currentErrorCount ?? 0
		for (let i = 0; i < this.props.length; i++) {
			if (traversalKind === "Allows") {
				if (!this.props[i].traverseAllows(data, ctx)) return false
			} else {
				this.props[i].traverseApply(data as never, ctx)
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

		if (!this.exhaustive) return true

		const keys: Key[] = Object.keys(data)
		keys.push(...Object.getOwnPropertySymbols(data))

		for (let i = 0; i < keys.length; i++) {
			const k = keys[i]

			let matched = false

			if (this.index) {
				for (const node of this.index) {
					if (node.signature.traverseAllows(k, ctx)) {
						if (traversalKind === "Allows") {
							ctx?.path.push(k)
							const result = node.value.traverseAllows(data[k as never], ctx)
							ctx?.path.pop()
							if (!result) return false
						} else {
							ctx.path.push(k)
							node.value.traverseApply(data[k as never], ctx)
							ctx.path.pop()
							if (ctx.failFast && ctx.currentErrorCount > errorCount)
								return false
						}

						matched = true
					}
				}
			}

			if (this.undeclared) {
				matched ||= k in this.propsByKey
				matched ||=
					this.sequence !== undefined &&
					typeof k === "string" &&
					arrayIndexMatcher.test(k)
				if (!matched) {
					if (traversalKind === "Allows") return false
					if (this.undeclared === "reject")
						ctx.error({ expected: "removed", actual: null, relativePath: [k] })
					else {
						ctx.queueMorphs([
							data => {
								delete data[k]
								return data
							}
						])
					}

					if (ctx.failFast) return false
				}
			}

			ctx?.path.pop()
		}

		return true
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Apply") js.initializeErrorCount()

		this.props.forEach(prop => {
			js.check(prop)
			if (js.traversalKind === "Apply") js.returnIfFailFast()
		})

		if (this.sequence) {
			js.check(this.sequence)
			if (js.traversalKind === "Apply") js.returnIfFailFast()
		}

		if (this.exhaustive) {
			js.const("keys", "Object.keys(data)")
			js.line("keys.push(...Object.getOwnPropertySymbols(data))")
			js.for("i < keys.length", () => this.compileExhaustiveEntry(js))
		}

		if (js.traversalKind === "Allows") js.return(true)
	}

	protected compileExhaustiveEntry(js: NodeCompiler): NodeCompiler {
		js.const("k", "keys[i]")

		if (this.undeclared) js.let("matched", false)

		this.index?.forEach(node => {
			js.if(
				`${js.invoke(node.signature, { arg: "k", kind: "Allows" })}`,
				() => {
					js.traverseKey("k", "data[k]", node.value)
					if (this.undeclared) js.set("matched", true)
					return js
				}
			)
		})

		if (this.undeclared) {
			if (this.props?.length !== 0)
				js.line(`matched ||= k in ${this.propsByKeyReference}`)

			if (this.sequence) {
				js.line(
					`matched ||= typeof k === "string" && ${arrayIndexMatcherReference}.test(k)`
				)
			}

			js.if("!matched", () => {
				if (js.traversalKind === "Allows") return js.return(false)
				return this.undeclared === "reject" ?
						js
							.line(
								`ctx.error({ expected: "removed", actual: null, relativePath: [k] })`
							)
							.if("ctx.failFast", () => js.return())
					:	js.line(`ctx.queueMorphs([data => { delete data[k]; return data }])`)
			})
		}

		return js
	}
}

const omitFromInner = (
	inner: StructureInner,
	keys: array<BaseRoot | Key>
): StructureInner => {
	const result = { ...inner }
	keys.forEach(k => {
		if (result.required) {
			result.required = result.required.filter(b =>
				hasArkKind(k, "root") ? !k.allows(b.key) : k !== b.key
			)
		}
		if (result.optional) {
			result.optional = result.optional.filter(b =>
				hasArkKind(k, "root") ? !k.allows(b.key) : k !== b.key
			)
		}
		if (result.index && hasArkKind(k, "root")) {
			// we only have to filter index nodes if the input was a node, as
			// literal keys should never subsume an index
			result.index = result.index.filter(n => !n.signature.extends(k))
		}
	})
	return result
}

const createStructuralWriter =
	(childStringProp: "expression" | "description") => (node: StructureNode) => {
		if (node.props.length || node.index) {
			const parts = node.index?.map(String) ?? []
			node.props.forEach(node => parts.push(node[childStringProp]))

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

export const structureImplementation: nodeImplementationOf<StructureDeclaration> =
	implementNode<StructureDeclaration>({
		kind: "structure",
		hasAssociatedError: false,
		normalize: schema => schema,
		keys: {
			required: {
				child: true,
				parse: constraintKeyParser("required")
			},
			optional: {
				child: true,
				parse: constraintKeyParser("optional")
			},
			index: {
				child: true,
				parse: constraintKeyParser("index")
			},
			sequence: {
				child: true,
				parse: constraintKeyParser("sequence")
			},
			undeclared: {
				parse: behavior => (behavior === "ignore" ? undefined : behavior)
			}
		},
		defaults: {
			description: structuralDescription
		},
		intersections: {
			structure: (l, r, ctx) => {
				const lInner = { ...l.inner }
				const rInner = { ...r.inner }
				if (l.undeclared) {
					const lKey = l.keyof()
					const disjointRKeys = r.requiredLiteralKeys.filter(
						k => !lKey.allows(k)
					)
					if (disjointRKeys.length) {
						return new Disjoint(
							...disjointRKeys.map(k => ({
								kind: "presence" as const,
								l: $ark.intrinsic.never.internal,
								r: r.propsByKey[k]!.value,
								path: [k],
								optional: false
							}))
						)
					}

					if (rInner.optional)
						rInner.optional = rInner.optional.filter(n => lKey.allows(n.key))
					if (rInner.index) {
						rInner.index = rInner.index.flatMap(n => {
							if (n.signature.extends(lKey)) return n
							const indexOverlap = intersectNodesRoot(lKey, n.signature, ctx.$)
							if (indexOverlap instanceof Disjoint) return []
							const normalized = normalizeIndex(indexOverlap, n.value, ctx.$)
							if (normalized.required) {
								rInner.required =
									rInner.required ?
										[...rInner.required, ...normalized.required]
									:	normalized.required
							}
							return normalized.index ?? []
						})
					}
				}
				if (r.undeclared) {
					const rKey = r.keyof()
					const disjointLKeys = l.requiredLiteralKeys.filter(
						k => !rKey.allows(k)
					)
					if (disjointLKeys.length) {
						return new Disjoint(
							...disjointLKeys.map(k => ({
								kind: "presence" as const,
								l: l.propsByKey[k]!.value,
								r: $ark.intrinsic.never.internal,
								path: [k],
								optional: false
							}))
						)
					}

					if (lInner.optional)
						lInner.optional = lInner.optional.filter(n => rKey.allows(n.key))
					if (lInner.index) {
						lInner.index = lInner.index.flatMap(n => {
							if (n.signature.extends(rKey)) return n
							const indexOverlap = intersectNodesRoot(rKey, n.signature, ctx.$)
							if (indexOverlap instanceof Disjoint) return []
							const normalized = normalizeIndex(indexOverlap, n.value, ctx.$)
							if (normalized.required) {
								lInner.required =
									lInner.required ?
										[...lInner.required, ...normalized.required]
									:	normalized.required
							}
							return normalized.index ?? []
						})
					}
				}

				const baseInner: MutableInner<"structure"> = {}

				if (l.undeclared || r.undeclared) {
					baseInner.undeclared =
						l.undeclared === "reject" || r.undeclared === "reject" ?
							"reject"
						:	"delete"
				}

				return intersectConstraints({
					kind: "structure",
					baseInner,
					l: flattenConstraints(lInner),
					r: flattenConstraints(rInner),
					roots: [],
					ctx
				})
			}
		}
	})

export type NormalizedIndex = {
	index?: IndexNode
	required?: RequiredNode[]
}

/** extract enumerable named props from an index signature */
export const normalizeIndex = (
	signature: BaseRoot,
	value: BaseRoot,
	$: RawRootScope
): NormalizedIndex => {
	const [enumerableBranches, nonEnumerableBranches] = spliterate(
		signature.branches,
		k => k.hasKind("unit")
	)

	if (!enumerableBranches.length)
		return { index: $.node("index", { signature, value }) }

	const normalized: NormalizedIndex = {}

	normalized.required = enumerableBranches.map(n =>
		$.node("required", { key: n.unit as Key, value })
	)
	if (nonEnumerableBranches.length) {
		normalized.index = $.node("index", {
			signature: nonEnumerableBranches,
			value
		})
	}

	return normalized
}
