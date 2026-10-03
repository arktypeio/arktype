import {
	append,
	conflatenate,
	conflatenateAll,
	flatMorph,
	nameOf,
	printable,
	spliterate,
	throwParseError,
	WeakCache,
	type array,
	type describe,
	type Key,
	type listable
} from "@ark/util"
import { BaseConstraint, constraintKeyParser } from "../constraint.ts"
import { intrinsic } from "../intrinsic.ts"
import type { BaseNode, GettableKeyOrNode, KeyOrKeyNode } from "../node.ts"
import type { Morph } from "../roots/morph.ts"
import { typeOrTermExtends, type BaseRoot } from "../roots/root.ts"
import type { BaseScope } from "../scope.ts"
import { compileSerializedValue, type NodeCompiler } from "../shared/compile.ts"
import type {
	attachmentsOf,
	BaseNormalizedSchema,
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
	traverseKey,
	type InternalTraversal,
	type TraversalKind,
	type TraverseAllows,
	type TraverseApply,
	type TraverseTransform
} from "../shared/traversal.ts"
import {
	hasArkKind,
	isNode,
	makeRootAndArrayPropertiesMutable
} from "../shared/utils.ts"
import type { Index } from "./index.ts"
import { Optional, type OptionalNode } from "./optional.ts"
import type { Prop } from "./prop.ts"
import type { Required, RequiredNode } from "./required.ts"
import type { Sequence } from "./sequence.ts"
import { arrayIndexMatcher } from "./shared.ts"

/**
 * - `"ignore"` (default) - allow and preserve extra properties
 * - `"reject"` - disallow extra properties
 * - `"delete"` - remove extra properties from output
 */
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
		normalize: schema => {
			// a set engine rejects duplicate keys in order with its other reduce errors
			if ($ark.sets) return schema
			const seen: Record<Key, true | undefined> = Object.create(null)
			for (const prop of conflatenateAll(schema.required, schema.optional)) {
				if (prop.key in seen)
					throwParseError(writeDuplicateKeyMessage(prop.key))
				seen[prop.key] = true
			}
			return schema
		},
		applyConfig: (schema, config) => {
			if (!schema.undeclared && config.onUndeclaredKey !== "ignore") {
				return {
					...schema,
					undeclared: config.onUndeclaredKey
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
						nodes!.map(
							node =>
								(ioKind === "in" ? node.rawIn : node.rawOut) as RequiredNode
						)
					)
					return
				}
			},
			optional: {
				child: true,
				parse: constraintKeyParser("optional"),
				reduceIo: (ioKind, inner, nodes) => {
					if (ioKind === "in") {
						inner.optional = nodes!.map(node => node.rawIn as OptionalNode)
						return
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
				child: true,
				parse: constraintKeyParser("index")
			},
			sequence: {
				child: true,
				parse: constraintKeyParser("sequence")
			},
			undeclared: {
				parse: behavior => (behavior === "ignore" ? undefined : behavior),
				reduceIo: (ioKind, inner, value) => {
					if (value === "reject") {
						inner.undeclared = "reject"
						return
					}

					// if base is "delete", undeclared keys are "ignore" (i.e. unconstrained)
					// on input and "reject" on output

					if (ioKind === "in") delete inner.undeclared
					else inner.undeclared = "reject"
				}
			}
		},
		defaults: {
			description: structuralDescription
		}
	})

export class StructureNode extends BaseConstraint<Structure.Declaration> {
	constructor(...args: ConstructorParameters<typeof BaseConstraint>) {
		super(...args)
		this.includesTransform ||= this.structuralMorph !== undefined
	}

	// a defaultable prop's rawIn depends on whether it was read before
	override get rawIn(): BaseNode {
		if (!this._rawIn && this.defaultable.length) this.keepInScope()
		return super.rawIn
	}

	impliedBasis: BaseRoot = $ark.intrinsic.object.internal
	impliedSiblings = this.children.flatMap(
		n => (n.impliedSiblings as BaseConstraint[]) ?? []
	)

	props: array<Prop.Node> = conflatenate<Prop.Node>(
		this.required,
		this.optional
	)

	// a null prototype, so a key like "toString" isn't declared
	propsByKey: Record<Key, Prop.Node | undefined> = Object.assign(
		Object.create(null),
		flatMorph(this.props, (i, node) => [node.key, node] as const)
	)

	expression: string = structuralExpression(this)

	// a key both a prop and an index signature transform takes both transforms at once
	readonly indexedValueByKey: Record<Key, BaseRoot> | undefined =
		this.intersectIndexedValues()

	private intersectIndexedValues(): Record<Key, BaseRoot> | undefined {
		if (!this.index) return
		let result: Record<Key, BaseRoot> | undefined
		for (const prop of this.props) {
			if (!prop.value.includesTransform) continue
			let value = prop.value
			for (const index of this.index) {
				if (!index.value.includesTransform || !index.signature.allows(prop.key))
					continue
				const intersection = $ark.sets?.intersect(value, index.value, this.$)
				if (!hasArkKind(intersection, "root")) return
				value = intersection
				;(result ??= Object.create(null))[prop.key] = value
			}
		}
		if (result && this._referencesById) {
			for (const k of Reflect.ownKeys(result))
				Object.assign(this._referencesById, result[k].referencesById)
		}
		return result
	}

	private transformOf(prop: Prop.Node): BaseRoot {
		return this.indexedValueByKey?.[prop.key] ?? prop.value
	}

	protected override get referencedBesidesChildren(): readonly BaseNode[] {
		const indexedValueByKey = this.indexedValueByKey
		return indexedValueByKey ?
				Reflect.ownKeys(indexedValueByKey).map(k => indexedValueByKey[k])
			:	[]
	}

	requiredKeys: Key[] = this.required?.map(node => node.key) ?? []

	optionalKeys: Key[] = this.optional?.map(node => node.key) ?? []

	literalKeys: Key[] = [...this.requiredKeys, ...this.optionalKeys]

	_keyof: BaseRoot | undefined
	keyof(): BaseRoot {
		if (this._keyof) return this._keyof
		let branches = this.$.units(this.literalKeys).branches
		if (this.index) {
			for (const { signature } of this.index)
				branches = branches.concat(signature.branches)
		}
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
			...(inner.sequence ? { sequence: inner.sequence.optionalize() } : {}),
			optional: this.props.map(prop =>
				prop.hasKind("required") ? this.$.node("optional", prop.inner) : prop
			)
		})
	}

	require(): StructureNode {
		const { optional, ...inner } = this.inner
		return this.$.node("structure", {
			...inner,
			...(inner.sequence ? { sequence: inner.sequence.require() } : {}),
			required: this.props.map(prop =>
				prop.hasKind("optional") ?
					{
						key: prop.key,
						value: prop.value
					}
				:	prop
			)
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
		ctx: InternalTraversal
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

		if (this.index || this.undeclared === "reject") {
			const keys = ownKeysOf(data)

			for (let i = 0; i < keys.length; i++) {
				const k = keys[i]

				if (this.index) {
					for (const node of this.index) {
						if (node.signature.traverseAllows(k, ctx)) {
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
									() => node.value.traverseApply(data[k as never], ctx),
									ctx
								)
								if (ctx.failFast && ctx.currentErrorCount > errorCount)
									return false
							}
						}
					}
				}

				if (this.undeclared === "reject" && !this.declaresKey(k)) {
					if (traversalKind === "Allows") return false

					// this should have its own error code:
					// https://github.com/arktypeio/arktype/issues/1403
					ctx.errorFromNodeContext({
						code: "predicate",
						expected: "removed",
						actual: "",
						relativePath: [k],
						meta: this.meta
					})

					if (ctx.failFast) return false
				}
			}
		}

		// added additional ctx check here to address
		// https://github.com/arktypeio/arktype/issues/1346
		if (this.structuralMorph && traversalKind === "Apply" && !ctx.hasError())
			ctx.queueMorphs([this.structuralMorph])

		return true
	}

	traverseTransform: TraverseTransform<object> = (data, ctx) => {
		const errorCount = ctx.currentErrorCount
		let out: any = data
		if (this.sequence?.transforms) {
			const transformedSequence = ctx.transform(this.sequence, data)
			if (transformedSequence !== data)
				out = this.copy(data, transformedSequence as object)
		}
		const transformKey = (k: Key, node: BaseRoot) => {
			const value = data[k as never]
			const transformed = traverseKey(k, () => ctx.transform(node, value), ctx)
			if (Object.is(transformed, value)) return
			if (out === data) out = this.copy(data)
			out[k] = transformed
		}
		for (let i = 0; i < this.props.length; i++) {
			const prop = this.props[i]
			if (prop.value.transforms && prop.key in data)
				transformKey(prop.key, this.transformOf(prop))
		}
		if (this.index) {
			const keys = ownKeysOf(data)
			for (let i = 0; i < keys.length; i++) {
				if (this.indexedValueByKey && keys[i] in this.indexedValueByKey)
					continue
				for (const node of this.index) {
					if (node.value.transforms && ctx.allows(node.signature, keys[i]))
						transformKey(keys[i], node.value)
				}
			}
		}
		if (ctx.currentErrorCount > errorCount) return data
		return this.applyStructuralMorph(data, out, ctx)
	}

	applyStructuralMorph(
		data: object,
		out: object,
		ctx: InternalTraversal
	): object {
		for (const node of this.defaultable) {
			if (node.key in data) continue
			if (out === data) out = this.copy(data)
			node.defaultValueMorph(out as never, ctx as never)
		}
		const sequence = this.sequence
		if (
			sequence?.defaultables &&
			(data as array).length <
				sequence.prefixLength + sequence.defaultablesLength
		) {
			if (out === data) out = this.copy(data)
			for (
				let i = (data as array).length - sequence.prefixLength;
				i < sequence.defaultables.length;
				i++
			)
				sequence.defaultValueMorphs[i](out as never, ctx as never)
		}
		if (this.undeclared !== "delete") return out
		const undeclaredKeys = this.undeclaredKeysOf(data)
		if (out === data && !undeclaredKeys.length) return out
		if (Object.getPrototypeOf(out) !== Object.prototype) {
			if (out === data) out = this.copy(data)
			for (const k of undeclaredKeys) delete out[k as never]
			return out
		}
		const result: Record<Key, unknown> = {}
		for (const prop of this.props)
			if (prop.key in out) result[prop.key] = out[prop.key as never]
		if (this.index) {
			for (const k of ownKeysOf(out)) {
				if (!(k in this.propsByKey) && this.declaresKey(k))
					result[k] = out[k as never]
			}
		}
		return result
	}

	private copy(data: object, copy = copyOf(data)): object {
		if (this.sequence) {
			for (const prop of this.props)
				if (prop.key in data) copy[prop.key as never] = data[prop.key as never]
		}
		return copy
	}

	private undeclaredKeysOf(data: object): Key[] {
		const keys: Key[] = []
		for (const k in data) if (!this.declaresKey(k)) keys.push(k)
		for (const k of Object.getOwnPropertySymbols(data))
			if (!this.declaresKey(k)) keys.push(k)
		return keys
	}

	readonly defaultable: Optional.Node.withDefault[] =
		this.optional?.filter(o => o.hasDefault()) ?? []

	declaresKey = (k: Key): boolean =>
		k in this.propsByKey ||
		this.index?.some(n => n.signature.allows(k)) ||
		(this.sequence !== undefined &&
			typeof k === "string" &&
			arrayIndexMatcher.test(k))

	_compileDeclaresKey(js: NodeCompiler, includeProps = true): string {
		const parts: string[] = []
		if (includeProps && this.props.length)
			parts.push(`k in ${js.ref(this.propsByKey)}`)

		if (this.index) {
			for (const index of this.index)
				parts.push(js.invoke(index.signature, { kind: "Allows", arg: "k" }))
		}

		if (this.sequence) {
			parts.push(
				`typeof k === "string" && ${js.ref(arrayIndexMatcher)}.test(k)`
			)
		}

		// if parts is empty, this is a structure like { "+": "reject" }
		// that declares no keys, so return false
		return parts.join(" || ") || "false"
	}

	readonly structuralMorph: Morph | undefined = getPossibleMorph(this)

	compile(js: NodeCompiler): unknown {
		if (js.traversalKind === "Transform") return this.compileTransform(js)
		if (js.traversalKind === "Apply") js.initializeErrorCount()

		for (const prop of this.props) {
			js.check(prop)
			if (js.traversalKind === "Apply") js.returnIfFailFast()
		}

		if (this.sequence) {
			js.check(this.sequence)
			if (js.traversalKind === "Apply") js.returnIfFailFast()
		}

		if (this.index || this.undeclared === "reject") {
			compileOwnKeys(js, "data")
			js.for("i < keys.length", () => this.compileExhaustiveEntry(js))
		}

		if (js.traversalKind === "Allows") return js.return(true)

		if (this.structuralMorph) {
			// added additional ctx check here to address
			// https://github.com/arktypeio/arktype/issues/1346
			js.if("ctx && !ctx.hasError()", () =>
				js.line(`ctx.queueMorphs([${js.ref(this.structuralMorph!)}])`)
			)
		}
	}

	private compileTransform(js: NodeCompiler): void {
		const transformedProps = this.props.filter(prop => prop.value.transforms)
		const transformedIndex =
			this.index?.filter(index => index.value.transforms) ?? []
		const deletes = this.undeclared === "delete"
		js.initializeTransform([
			...(this.sequence?.transforms ? [this.sequence] : []),
			...transformedProps.map(prop => this.transformOf(prop)),
			...transformedIndex.map(index => index.value)
		])
		js.line("let out = data")
		if (this.sequence?.transforms) {
			js.transformKey("transformedSequence", "data", this.sequence, {
				onChange: () => this.compileArrayCopy(js, "transformedSequence")
			})
		}
		for (let i = 0; i < transformedProps.length; i++) {
			const { key, serializedKey, optional } = transformedProps[i]
			js.const(`value${i}`, `data${js.prop(key)}`).transformKey(
				`transformed${i}`,
				`value${i}`,
				this.transformOf(transformedProps[i]),
				{
					keyExpression: serializedKey,
					...(optional && { condition: `${serializedKey} in data` }),
					...(!deletes && {
						onChange: () =>
							this.compileCopy(js).line(`out${js.prop(key)} = transformed${i}`)
					})
				}
			)
		}
		if (transformedIndex.length) {
			compileOwnKeys(js, "data").for("i < keys.length", () => {
				js.const("k", "keys[i]")
				if (this.indexedValueByKey) {
					js.if(`k in ${js.ref(this.indexedValueByKey)}`, () =>
						js.line("continue")
					)
				}
				for (const index of transformedIndex) {
					js.if(js.invoke(index.signature, { arg: "k", kind: "Allows" }), () =>
						js
							.const("value", "data[k]")
							.transformKey("transformed", "value", index.value, {
								keyExpression: "k",
								onChange: () =>
									this.compileCopy(js).line("out[k] = transformed")
							})
					)
				}
				return js
			})
		}
		js.returnIfTransformFailed()
		if (deletes) {
			return this.compileDeleteTransform(
				js,
				transformedProps,
				this.sequence?.transforms || transformedIndex.length !== 0
			)
		}
		for (const node of this.defaultable) {
			js.if(`!(${node.serializedKey} in data)`, () =>
				this.compileCopy(js).line(compileDefault(js, node, "out"))
			)
		}
		this.compileSequenceDefaults(js)
		js.return("out")
	}

	private compileCopy(js: NodeCompiler, objectCopy?: string): NodeCompiler {
		return js.if("out === data", () =>
			this.sequence ?
				this.compileArrayCopy(js, "data.slice()")
			:	js.line(
					`out = ${objectCopy ?? `Object.getPrototypeOf(data) === Object.prototype ? { ...data } : ${js.ref(copyOf)}(data)`}`
				)
		)
	}

	private compileArrayCopy(js: NodeCompiler, copy: string): NodeCompiler {
		js.line(`out = ${copy}`)
		for (const prop of this.props) {
			const store = `out${js.prop(prop.key)} = data${js.prop(prop.key)}`
			if (prop.required) js.line(store)
			else js.if(`${prop.serializedKey} in data`, () => js.line(store))
		}
		return js
	}

	private compileSequenceDefaults(js: NodeCompiler): void {
		const sequence = this.sequence
		if (!sequence?.defaultables) return
		const args =
			sequence.defaultValueMorphs.some(morph => morph.length !== 1) ?
				"out, ctx"
			:	"out"
		js.if(
			`data.length < ${sequence.prefixLength + sequence.defaultablesLength}`,
			() =>
				this.compileCopy(js).for(
					`i < ${sequence.defaultables!.length}`,
					() => js.line(`${js.ref(sequence.defaultValueMorphs)}[i](${args})`),
					`data.length - ${sequence.prefixLength}`
				)
		)
	}

	private compileDeleteTransform(
		js: NodeCompiler,
		transformedProps: Prop.Node[],
		outMayBeCopied: boolean
	): void {
		const unchanged = [
			...(outMayBeCopied ? ["out === data"] : []),
			...transformedProps.map((prop, i) =>
				js.compareTransformed(
					this.transformOf(prop),
					`transformed${i}`,
					"===",
					`value${i}`
				)
			),
			...this.defaultable.map(node => `${node.serializedKey} in data`)
		]
		if (this.sequence?.defaultables) {
			unchanged.push(
				`data.length >= ${this.sequence.prefixLength + this.sequence.defaultablesLength}`
			)
		}
		const stringKeys = this.props.filter(prop => typeof prop.key === "string")
		const breakIfUndeclared = (declaresKey: string) =>
			declaresKey === "false" ?
				js.line("break undeclared")
			:	js.if(`!(${declaresKey})`, () => js.line("break undeclared"))
		const label =
			unchanged.length ?
				`undeclared: if (${unchanged.join(" && ")})`
			:	"undeclared:"
		js.block(label, () => {
			js.forIn("data", () => {
				if (stringKeys.length) {
					js.block("switch (k)", () =>
						js.line(
							`${stringKeys.map(prop => `case ${prop.serializedKey}:`).join(" ")} continue`
						)
					)
				}
				return breakIfUndeclared(this._compileDeclaresKey(js, false))
			})
			js.block("for (const k of Object.getOwnPropertySymbols(data))", () =>
				breakIfUndeclared(this._compileDeclaresKey(js))
			)
			return js.return("data")
		})
		const deleteFromCopy = (objectCopy?: string) => {
			for (let i = 0; i < transformedProps.length; i++) {
				const prop = transformedProps[i]
				const changed = js.compareTransformed(
					this.transformOf(prop),
					`transformed${i}`,
					"!==",
					`value${i}`
				)
				js.if(changed, () =>
					this.compileCopy(js, objectCopy).line(
						`out${js.prop(prop.key)} = transformed${i}`
					)
				)
			}
			return js.return(`${js.ref(this)}.applyStructuralMorph(data, out, ctx)`)
		}
		if (this.sequence) {
			deleteFromCopy()
			return
		}
		const valueOf = (prop: Prop.Node) => {
			const i = transformedProps.indexOf(prop)
			return i === -1 ? `out${js.prop(prop.key)}` : `transformed${i}`
		}
		const requiredEntries = this.props
			.filter(prop => prop.required)
			.map(prop => `${literalKeyOf(js, prop)}: ${valueOf(prop)}`)
		js.const("result", `{ ${requiredEntries.join(", ")} }`)
		// checked after the literal's reads, from which V8 can infer data's prototype
		js.if("Object.getPrototypeOf(data) !== Object.prototype", () =>
			deleteFromCopy(`${js.ref(copyOf)}(data)`)
		)
		for (const prop of this.props) {
			if (prop.required) continue
			const store = `result${js.prop(prop.key)} = ${valueOf(prop)}`
			if (prop.hasKind("optional") && prop.hasDefault()) {
				js.if(`${prop.serializedKey} in data`, () => js.line(store)).else(() =>
					js.line(compileDefault(js, prop, "result"))
				)
			} else js.if(`${prop.serializedKey} in data`, () => js.line(store))
		}
		if (this.index) {
			compileOwnKeys(js, "out", "outKeys", "outSymbols").for(
				"i < outKeys.length",
				() =>
					js
						.const("k", "outKeys[i]")
						.if(
							`!(k in ${js.ref(this.propsByKey)}) && (${this._compileDeclaresKey(js, false)})`,
							() => js.line("result[k] = out[k]")
						)
			)
		}
		js.return("result")
	}

	protected compileExhaustiveEntry(js: NodeCompiler): NodeCompiler {
		js.const("k", "keys[i]")

		if (this.index) {
			for (const node of this.index) {
				js.if(
					`${js.invoke(node.signature, { arg: "k", kind: "Allows" })}`,
					() => js.traverseKey("k", "data[k]", node.value)
				)
			}
		}

		if (this.undeclared === "reject") {
			js.if(`!(${this._compileDeclaresKey(js)})`, () => {
				if (js.traversalKind === "Allows") return js.return(false)
				return js
					.line(
						`ctx.errorFromNodeContext({ code: "predicate", expected: "removed", actual: "", relativePath: [k], meta: ${this.compiledMeta} })`
					)
					.if("ctx.failFast", () => js.return())
			})
		}

		return js
	}
}

const defaultableMorphsCache = new WeakCache<Morph>()

type PartiallyInitializedStructure = attachmentsOf<Structure.Declaration> &
	Pick<Structure.Node, "defaultable" | "declaresKey">

const constructStructuralMorphCacheKey = (
	node: PartiallyInitializedStructure
): string => {
	let cacheKey = ""

	// nameOf names each morph uniquely without registering, which would keep it alive
	for (let i = 0; i < node.defaultable.length; i++)
		cacheKey += `${nameOf(node.defaultable[i].defaultValueMorph)} `

	if (node.sequence?.defaultValueMorphs?.length)
		cacheKey += `${nameOf(node.sequence.defaultValueMorphs)} `

	if (node.undeclared === "delete") {
		cacheKey += "delete !("
		if (node.required)
			for (const n of node.required) cacheKey += n.compiledKey + " | "
		if (node.optional)
			for (const n of node.optional) cacheKey += n.compiledKey + " | "
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

const compileDefault = (
	js: NodeCompiler,
	node: Optional.Node.withDefault,
	out: string
): string =>
	node.value.includesTransform ?
		`${js.ref(node.defaultValueMorph)}(${out}${node.defaultValueMorph.length === 1 ? "" : ", ctx"})`
	: typeof node.default === "function" ?
		`${out}${js.prop(node.key)} = ${js.ref(node.default)}()`
	:	`${out}${js.prop(node.key)} = ${compileSerializedValue(node.default)}`

// computed if __proto__, which would otherwise set the literal's prototype
const literalKeyOf = (js: NodeCompiler, prop: Prop.Node): string =>
	typeof prop.key === "symbol" ? `[${js.ref(prop.key)}]`
	: prop.key === "__proto__" ? `[${prop.serializedKey}]`
	: prop.serializedKey

const compileOwnKeys = (
	js: NodeCompiler,
	object: string,
	keys = "keys",
	symbols = "symbols"
): NodeCompiler =>
	js
		.const(keys, `Object.keys(${object})`)
		.const(symbols, `Object.getOwnPropertySymbols(${object})`)
		.if(`${symbols}.length`, () => js.line(`${keys}.push(...${symbols})`))

const ownKeysOf = (data: object): Key[] => {
	const keys: Key[] = Object.keys(data)
	const symbols = Object.getOwnPropertySymbols(data)
	if (symbols.length) keys.push(...symbols)
	return keys
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

export const writeDuplicateKeyMessage = <key extends Key>(
	key: key
): writeDuplicateKeyMessage<key> =>
	`Duplicate key ${compileSerializedValue(key) as never}`

export type writeDuplicateKeyMessage<key extends Key> =
	`Duplicate key '${describe<key>}'`

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

	for (const n of enumerableBranches) {
		// since required can be reduced to optional if it has a default or
		// optional meta on its value, we have to assign it depending on the
		// compiled kind
		const prop = $.node("required", { key: n.unit as Key, value })
		normalized[prop.kind] = append(normalized[prop.kind], prop as never)
	}

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
