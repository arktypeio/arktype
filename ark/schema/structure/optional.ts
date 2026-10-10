import {
	hasDomain,
	isThunk,
	printable,
	throwParseError,
	type requireKeys
} from "@ark/util"
import type { BaseNode } from "../node.ts"
import type { Morph } from "../roots/morph.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { declareNode } from "../shared/declare.ts"
import { ArkErrors, mergeErrors } from "../shared/errors.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import { missingSetEngineMessage } from "../shared/sets.ts"
import { computeDefaultValueMorph } from "../shared/traversal.ts"
import { isResolutionFinal, queueUnchecked } from "../shared/utils.ts"
import { BaseProp, type Prop } from "./prop.ts"

export declare namespace Optional {
	export interface Inner extends Prop.Inner {
		default?: unknown
	}

	export type Declaration = declareNode<
		Prop.Declaration<"optional"> & {
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
				structural: true
			},
			default: {
				preserveUndefined: true
			}
		},
		defaults: {
			description: node => `${node.compiledKey}?: ${node.value.description}`
		}
	})

export class OptionalNode extends BaseProp<"optional"> {
	constructor(...args: ConstructorParameters<typeof BaseProp>) {
		super(...args)
		if (
			!$ark.sets &&
			this.$.resolvedConfig.exactOptionalPropertyTypes === false
		)
			throwParseError(missingSetEngineMessage)
		if ("default" in this.inner)
			assertDefaultValueAssignability(this.value, this.inner.default, this.key)
		// a function default can fail as it's applied, like a morph
		this.includesMorph ||= typeof this.inner.default === "function"
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
			`${this.compiledKey}: ${this.value.expression} = ${printable(this.inner.default, { ownDataOnly: true })}`
		:	`${this.compiledKey}?: ${this.value.expression}`

	defaultValueMorph: Morph | undefined =
		this.hasDefault() ?
			computeDefaultValueMorph(this.key, this.value, this.default)
		:	undefined
}

export const Optional = {
	implementation,
	Node: OptionalNode
}

export const assertDefaultValueAssignability = (
	node: BaseRoot,
	value: unknown,
	key: PropertyKey | null
): unknown => {
	// a function default is checked each time it's applied
	if (isThunk(value)) return value

	if (hasDomain(value, "object"))
		throwParseError(writeNonPrimitiveNonFunctionDefaultValueMessage(key))

	return assertDefaultAssignability(node, value, key)
}

// a function default's result can be an object, so it skips the non-primitive check
export const assertDefaultAssignability = (
	node: BaseRoot,
	value: unknown,
	key: PropertyKey | null
): unknown => {
	if (!isResolutionFinal() && node.includesAlias) {
		queueUnchecked(() => assertDefaultAssignability(node, value, key))
		return value
	}

	// if the node has a default value, finalize it and apply JIT optimizations
	// if applicable to ensure behavior + error logging is externally consistent
	// (using .in here insead of .rawIn triggers finalization)
	const out = (node.in as BaseRoot).traverse(value)

	if (out instanceof ArkErrors) {
		// a ParseError is for the developer, so it renders in English
		const en = $ark.defaultConfig.locale

		if (key === null) {
			// e.g. "Default must be assignable to number (was string)"
			throwParseError(`Default ${out.toLocaleString(en)}`)
		}

		const atPath = new ArkErrors(node.$.resolvedConfig)
		mergeErrors(atPath, out, [key])

		// e.g. "Default for bar must be assignable to number (was string)"
		// e.g. "Default for value at [0] must be assignable to number (was string)"
		throwParseError(`Default for ${atPath.toLocaleString(en)}`)
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
		: `for ${printable(key)} `
	return `Non-primitive default ${keyDescription}must be specified as a function like () => ({my: 'object'})`
}
