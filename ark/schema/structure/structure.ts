import {
	append,
	conflatenate,
	flatMorph,
	printable,
	spliterate,
	throwParseError,
	type array,
	type Key,
	type listable
} from "@ark/util"
import {
	BaseConstraint,
	constraintKeyParser,
	flattenConstraints,
	intersectConstraints
} from "../constraint.ts"
import type { GettableKeyOrNode, KeyOrKeyNode } from "../node.ts"
import { typeOrTermExtends, type BaseRoot } from "../roots/root.ts"
import type { BaseScope } from "../scope.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.ts"
import { Disjoint } from "../shared/disjoint.ts"
import {
	implementNode,
	type nodeImplementationOf,
	type StructuralKind
} from "../shared/implement.ts"
import { intersectNodesRoot } from "../shared/intersections.ts"
import {
	throwInternalJsonSchemaOperandError,
	writeUnsupportedJsonSchemaTypeMessage,
	type JsonSchema
} from "../shared/jsonSchema.ts"
import {
	$ark,
	registeredReference,
	type RegisteredReference
} from "../shared/registry.ts"
import type {
	TraversalContext,
	TraversalKind,
	TraverseAllows,
	TraverseApply
} from "../shared/traversal.ts"
import {
	hasArkKind,
	isNode,
	makeRootAndArrayPropertiesMutable
} from "../shared/utils.ts"
import type { Index } from "./index.ts"
import { Optional, type OptionalNode } from "./optional.ts"
import type { Prop } from "./prop.ts"
import type { Required } from "./required.ts"
import type { Sequence } from "./sequence.ts"
import { arrayIndexMatcherReference } from "./shared.ts"

export type UndeclaredKeyBehavior = "ignore" | UndeclaredKeyHandling

export type UndeclaredKeyHandling = "reject" | "delete"

export declare namespace Structure {
	export interface Schema extends BaseNormalizedSchema {
		readonly optional?: readonly Optional.Schema[]
		readonly required?: readonly Required.Schema[]
		readonly index?: readonly Index.Schema[]
		readonly sequence?: Sequence.Schema
		readonly undeclared?: UndeclaredKeyBehavior
	}

	export interface Inner {
		readonly optional?: readonly Optional.Node[]
		readonly required?: readonly Required.Node[]
		readonly index?: readonly Index.Node[]
		readonly sequence?: Sequence.Node
		readonly undeclared?: UndeclaredKeyHandling
	}

	export namespace Inner {
		export type mutable = makeRootAndArrayPropertiesMutable<Inner>
	}

	export interface Declaration
		extends declareNode<{
			kind: "structure"
			schema: Schema
			normalizedSchema: Schema
			inner: Inner
			prerequisite: object
			childKind: StructuralKind
		}> {}

	export type Node = StructureNode
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

const implementation: nodeImplementationOf<Structure.Declaration> =
	implementNode<Structure.Declaration>({
		kind: "structure",
		hasAssociatedError: false,
		normalize: (schema, $) => {
			if (!schema.undeclared && $.resolvedConfig.onUndeclaredKey !== "ignore") {
				return {
					...schema,
					undeclared: $.resolvedConfig.onUndeclaredKey
				}
			}
			return schema
		},
		keys: {
			required: {
				child: true,
				parse: constraintKeyParser("required"),
				reduceIo: (ioKind, inner, nodes) => {
					// ensure we don't overwrite nodes added by optional
					inner.required = append(
						inner.required,
						nodes!.map(node => node[ioKind] as Required.Node)
					)
					return
				}
			},
			optional: {
				child: true,
				parse: constraintKeyParser("optional"),
				reduceIo: (ioKind, inner, nodes) => {
					if (ioKind === "in") {
						inner.optional = nodes!.map(node => node.in as OptionalNode)
						return
					}

					nodes!.forEach(
						node =>
							(inner[node.outProp.kind] = append(
								inner[node.outProp.kind],
								node.outProp.out as Prop.Node
							) as never)
					)
				}
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
					const disjointRKeys = r.requiredKeys.filter(k => !lKey.allows(k))
					if (disjointRKeys.length) {
						return new Disjoint(
							...disjointRKeys.map(k => ({
								kind: "presence" as const,
								discriminantKind: undefined,
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
								rInner.required = conflatenate(
									rInner.required,
									normalized.required
								)
							}
							if (normalized.optional) {
								rInner.optional = conflatenate(
									rInner.optional,
									normalized.optional
								)
							}
							return normalized.index ?? []
						})
					}
				}
				if (r.undeclared) {
					const rKey = r.keyof()
					const disjointLKeys = l.requiredKeys.filter(k => !rKey.allows(k))
					if (disjointLKeys.length) {
						return new Disjoint(
							...disjointLKeys.map(k => ({
								kind: "presence" as const,
								discriminantKind: undefined,
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
								lInner.required = conflatenate(
									lInner.required,
									normalized.required
								)
							}
							if (normalized.optional) {
								lInner.optional = conflatenate(
									lInner.optional,
									normalized.optional
								)
							}

							return normalized.index ?? []
						})
					}
				}

				const baseInner: Structure.Inner.mutable = {}

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

export class StructureNode extends BaseConstraint<Structure.Declaration> {
	impliedBasis: BaseRoot = $ark.intrinsic.object.internal
	impliedSiblings = this.children.flatMap(
		n => (n.impliedSiblings as BaseConstraint[]) ?? []
	)

	props: array<Prop.Node> = conflatenate<Prop.Node>(
		this.required,
		this.optional
	)

	propsByKey: Record<Key, Prop.Node | undefined> = flatMorph(
		this.props,
		(i, node) => [node.key, node] as const
	)

	propsByKeyReference: RegisteredReference = registeredReference(
		this.propsByKey
	)

	expression: string = structuralExpression(this)

	requiredKeys: Key[] = this.required?.map(node => node.key) ?? []

	optionalKeys: Key[] = this.optional?.map(node => node.key) ?? []

	literalKeys: Key[] = [...this.requiredKeys, ...this.optionalKeys]

	_keyof: BaseRoot | undefined
	keyof(): BaseRoot {
		if (this._keyof) return this._keyof
		let branches = this.$.units(this.literalKeys).branches
		this.index?.forEach(({ signature }) => {
			branches = branches.concat(signature.branches)
		})
		return (this._keyof = this.$.node("union", branches))
	}

	map(flatMapProp: PropFlatMapper): StructureNode {
		return this.$.node(
			"structure",
			this.props
				.flatMap(flatMapProp)
				.reduce((structureInner: Structure.Inner.mutable, mapped) => {
					const originalProp = this.propsByKey[mapped.key]

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

		this.index?.forEach(n => {
			if (typeOrTermExtends(key, n.signature))
				value = value?.and(n.value) ?? n.value
		})

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
					const fixedElement = this.sequence.prevariadic[index]
					value = value?.and(fixedElement) ?? fixedElement
					required ||= index < this.sequence.prefixLength
				} else if (this.sequence.variadic) {
					// ideally we could return something more specific for postfix
					// but there is no way to represent it using an index alone
					const nonFixedElement = this.$.node(
						"union",
						this.sequence.variadicOrPostfix
					)
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

	readonly exhaustive: boolean =
		this.undeclared !== undefined || this.index !== undefined

	pick(...keys: KeyOrKeyNode[]): StructureNode {
		this.assertHasKeys(keys)
		return this.$.node("structure", this.filterKeys("pick", keys))
	}

	omit(...keys: KeyOrKeyNode[]): StructureNode {
		this.assertHasKeys(keys)
		return this.$.node("structure", this.filterKeys("omit", keys))
	}

	optionalize(): StructureNode {
		const { required, ...inner } = this.inner
		return this.$.node("structure", {
			...inner,
			optional: this.props.map(prop =>
				prop.hasKind("required") ? this.$.node("optional", prop.inner) : prop
			)
		})
	}

	require(): StructureNode {
		const { optional, ...inner } = this.inner
		return this.$.node("structure", {
			...inner,
			required: this.props.map(prop => {
				if (prop.hasKind("required")) return prop
				// strip default/optional meta from the value so that it
				// isn't reduced back to an optional prop
				return this.$.node("required", {
					key: prop.key,
					value: prop.value.withoutOptionalOrDefaultMeta()
				})
			})
		})
	}

	merge(r: StructureNode): StructureNode {
		const inner = this.filterKeys("omit", [r.keyof()])

		if (r.required) inner.required = append(inner.required, r.required)
		if (r.optional) inner.optional = append(inner.optional, r.optional)
		if (r.index) inner.index = append(inner.index, r.index)
		if (r.sequence) inner.sequence = r.sequence
		if (r.undeclared) inner.undeclared = r.undeclared
		else delete inner.undeclared
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
					$ark.intrinsic.nonNegativeIntegerString.allows(k)
				if (!matched) {
					if (traversalKind === "Allows") return false
					if (this.undeclared === "reject")
						ctx.error({ expected: "removed", actual: "", relativePath: [k] })
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
								`ctx.error({ expected: "removed", actual: "", relativePath: [k] })`
							)
							.if("ctx.failFast", () => js.return())
					:	js.line(`ctx.queueMorphs([data => { delete data[k]; return data }])`)
			})
		}

		return js
	}

	reduceJsonSchema(schema: JsonSchema.Structure): JsonSchema.Structure {
		switch (schema.type) {
			case "object":
				return this.reduceObjectJsonSchema(schema)
			case "array":
				if (this.props.length || this.index) {
					throwParseError(
						writeUnsupportedJsonSchemaTypeMessage(
							`Additional properties on array ${this.expression}`
						)
					)
				}
				return this.sequence?.reduceJsonSchema(schema) ?? schema
			default:
				return throwInternalJsonSchemaOperandError("structure", schema)
		}
	}

	reduceObjectJsonSchema(schema: JsonSchema.Object): JsonSchema.Object {
		if (this.props.length) {
			schema.properties = {}
			this.props.forEach(prop => {
				if (typeof prop.key === "symbol") {
					return throwParseError(
						writeUnsupportedJsonSchemaTypeMessage(
							`Sybolic key ${prop.serializedKey}`
						)
					)
				}

				schema.properties![prop.key] = prop.value.toJsonSchema()
			})
			if (this.requiredKeys.length)
				schema.required = this.requiredKeys as string[]
		}

		this.index?.forEach(index => {
			if (index.signature.equals($ark.intrinsic.string))
				return (schema.additionalProperties = index.value.toJsonSchema())

			if (!index.signature.extends($ark.intrinsic.string)) {
				return throwParseError(
					writeUnsupportedJsonSchemaTypeMessage(
						`Symbolic index signature ${index.signature.exclude($ark.intrinsic.string)}`
					)
				)
			}

			index.signature.branches.forEach(keyBranch => {
				if (
					!keyBranch.hasKind("intersection") ||
					keyBranch.pattern?.length !== 1
				) {
					return throwParseError(
						writeUnsupportedJsonSchemaTypeMessage(
							`Index signature ${keyBranch}`
						)
					)
				}
				schema.patternProperties ??= {}
				schema.patternProperties[keyBranch.pattern[0].rule] =
					index.value.toJsonSchema()
			})
		})

		if (this.undeclared && !schema.additionalProperties)
			schema.additionalProperties = false

		return schema
	}
}

export type PropFlatMapper = (entry: Prop.Node) => listable<MappedPropInner>

export type MappedPropInner = BaseMappedPropInner | OptionalMappedPropInner

// this assumes the props on Required.Inner are a subset of those on Optional.Inner
export interface BaseMappedPropInner extends Required.Schema {
	kind?: "required" | "optional"
}

export interface OptionalMappedPropInner extends Optional.Schema {
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

	if (!enumerableBranches.length)
		return { index: $.node("index", { signature, value }) }

	const normalized: NormalizedIndex = {}

	enumerableBranches.forEach(n => {
		// since required can be reduced to optional if it has a default or
		// optional meta on its value, we have to assign it depending on the
		// compiled kind
		const prop = $.node("required", { key: n.unit as Key, value })
		normalized[prop.kind] = append(normalized[prop.kind], prop as never)
	})

	if (nonEnumerableBranches.length) {
		normalized.index = $.node("index", {
			signature: nonEnumerableBranches,
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
