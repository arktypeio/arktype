import {
	hasDomain,
	isThunk,
	printable,
	throwParseError,
	WeakCache,
	type requireKeys
} from "@ark/util"
import type { BaseNode } from "../node.ts"
import type { Morph } from "../roots/morph.ts"
import type { BaseRoot } from "../roots/root.ts"
import { compileSerializedValue } from "../shared/compile.ts"
import type { declareNode } from "../shared/declare.ts"
import { ArkErrors } from "../shared/errors.ts"
import {
	defaultValueSerializer,
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import { missingSetEngineMessage } from "../shared/sets.ts"
import { traverseKey } from "../shared/traversal.ts"
import { isResolutionFinal, queueUnchecked } from "../shared/utils.ts"
import { BaseProp, type Prop } from "./prop.ts"

export declare namespace Optional {
	export interface Schema extends Prop.Schema {
		default?: unknown
	}

	export interface Inner extends Prop.Inner {
		default?: unknown
	}

	export type Declaration = declareNode<
		Prop.Declaration<"optional"> & {
			schema: Schema
			normalizedSchema: Schema
			inner: Inner
		}
	>

	export type Node = OptionalNode

	export namespace Node {
		export type withDefault = requireKeys<Node, "default" | "defaultValueMorph">
	}
}

const implementation: nodeImplementationOf<Optional.Declaration> =
	implementNode<Optional.Declaration>({
		kind: "optional",
		hasAssociatedError: false,
		intersectionIsOpen: true,
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.$.parseStructuralValue(schema)
			},
			default: {
				preserveUndefined: true
			}
		},
		normalize: (schema, $) =>
			!$ark.sets && $.resolvedConfig.exactOptionalPropertyTypes === false ?
				throwParseError(missingSetEngineMessage)
			:	schema,
		defaults: {
			description: node => `${node.compiledKey}?: ${node.value.description}`
		}
	})

export class OptionalNode extends BaseProp<"optional"> {
	constructor(...args: ConstructorParameters<typeof BaseProp>) {
		super(...args)
		if ("default" in this.inner)
			assertDefaultValueAssignability(this.value, this.inner.default, this.key)
		this.includesContextualMorph ||= this.defaultValueMorph?.length === 2
	}

	override getIo(ioKind: "in" | "out"): BaseNode {
		if (ioKind === "out" || !this.hasDefault()) return super.getIo(ioKind)
		return this.$.node(
			"optional",
			{ key: this.key, value: this.value.rawIn },
			{ prereduced: true }
		)
	}

	private _outProp: Prop.Node | undefined
	get outProp(): Prop.Node {
		if (!this.hasDefault()) return this
		const { default: defaultValue, ...requiredInner } = this.inner

		return (this._outProp ??= this.$.node("required", requiredInner, {
			prereduced: true
		}) as never)
	}

	expression: string =
		this.hasDefault() ?
			`${this.compiledKey}: ${this.value.expression} = ${printable(this.inner.default)}`
		:	`${this.compiledKey}?: ${this.value.expression}`

	defaultValueMorph: Morph | undefined = getDefaultableMorph(this)
}

export const Optional = {
	implementation,
	Node: OptionalNode
}

const defaultableMorphCache = new WeakCache<Morph>()

const getDefaultableMorph = (node: Optional.Node): Morph | undefined => {
	if (!node.hasDefault()) return

	const cacheKey = `{${node.compiledKey}: ${node.value.id} = ${defaultValueSerializer(node.default)}}`

	const cached = defaultableMorphCache.get(cacheKey)
	if (cached) return cached

	const morph = computeDefaultValueMorph(node.key, node.value, node.default)
	return node.value.includesTransform || node.value.includesAlias ?
			defaultableMorphCache.pin(cacheKey, morph)
		:	defaultableMorphCache.set(cacheKey, morph)
}

export const computeDefaultValueMorph = (
	key: PropertyKey,
	value: BaseRoot,
	defaultInput: unknown
): Morph<any> => {
	if (typeof defaultInput === "function") {
		if (!value.includesTransform && !value.includesAlias) {
			return data => {
				data[key] = defaultInput()
				return data
			}
		}
		let transformingDefault = false
		return (data, ctx) => {
			// transforming a default through a cyclic value can reach this morph again
			if (transformingDefault) return data
			if (!value.transforms) {
				data[key] = defaultInput()
				return data
			}
			transformingDefault = true
			try {
				data[key] = traverseKey(key, () => value(defaultInput(), ctx), ctx)
			} finally {
				transformingDefault = false
			}
			return data
		}
	}

	// non-functional defaults can be safely cached as long as the morph is
	// guaranteed to be pure and the output is primitive
	const precomputedMorphedDefault =
		value.includesTransform ? value.assert(defaultInput) : defaultInput

	return hasDomain(precomputedMorphedDefault, "object") ?
			// the type signature only allows this if the value was morphed
			(data, ctx) => {
				data[key] = traverseKey(key, () => value(defaultInput, ctx), ctx)
				return data
			}
		:	data => {
				data[key] = precomputedMorphedDefault
				return data
			}
}

export const assertDefaultValueAssignability = (
	node: BaseRoot,
	value: unknown,
	key: PropertyKey | null
): unknown => {
	const wrapped = isThunk(value)

	if (hasDomain(value, "object") && !wrapped)
		throwParseError(writeNonPrimitiveNonFunctionDefaultValueMessage(key))

	if (!isResolutionFinal() && node.includesAlias) {
		queueUnchecked(() => assertDefaultValueAssignability(node, value, key))
		return value
	}

	// if the node has a default value, finalize it and apply JIT optimizations
	// if applicable to ensure behavior + error logging is externally consistent
	// (using .in here insead of .rawIn triggers finalization)
	const out = (node.in as BaseRoot)(wrapped ? value() : value)

	if (out instanceof ArkErrors) {
		if (key === null) {
			// e.g. "Default must be assignable to number (was string)"
			throwParseError(`Default ${out.summary}`)
		}

		const atPath = out.transform(e =>
			e.transform(input => ({ ...input, prefixPath: [key] }) as never)
		)

		// e.g. "Default for bar must be assignable to number (was string)"
		// e.g. "Default for value at [0] must be assignable to number (was string)"
		throwParseError(`Default for ${atPath.summary}`)
	}

	return value
}

export type writeUnassignableDefaultValueMessage<
	baseDef extends string,
	defaultValue extends string
> = `Default value ${defaultValue} must be assignable to ${baseDef}`

export const writeNonPrimitiveNonFunctionDefaultValueMessage = (
	key: PropertyKey | null
): string => {
	const keyDescription =
		key === null ? ""
		: typeof key === "number" ? `for value at [${key}] `
		: `for ${compileSerializedValue(key)} `
	return `Non-primitive default ${keyDescription}must be specified as a function like () => ({my: 'object'})`
}
