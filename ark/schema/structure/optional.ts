import {
	hasDomain,
	isThunk,
	omit,
	printable,
	throwParseError,
	type requireKeys
} from "@ark/util"
import type { BaseNode } from "../node.ts"
import type { Morph } from "../roots/morph.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { declareNode } from "../shared/declare.ts"
import { ArkErrors } from "../shared/errors.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import { missingSetEngineMessage } from "../shared/sets.ts"
import { computeDefaultValueMorph } from "../shared/traversal.ts"
import {
	composing,
	elided,
	isResolutionFinal,
	queueUnchecked
} from "../shared/utils.ts"
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
		export type withDefault = requireKeys<Node, "default" | "defMorph">
	}
}

const implementation: nodeImplementationOf<Optional.Declaration> =
	implementNode<Optional.Declaration>({
		kind: "optional",
		ownErr: false,
		stacks: true,
		keys: {
			key: {},
			value: {
				child: true,
				structural: true
			},
			default: {
				keepUndef: true
			}
		},
		defaults: {
			description: node => `${node.keyStr}?: ${elided(node.value.description)}`
		}
	})

export class OptionalNode extends BaseProp<"optional"> {
	constructor(...args: ConstructorParameters<typeof BaseProp>) {
		super(...args)
		if (!$ark.sets && this.$.cfg.exactOptionalPropertyTypes === false)
			throwParseError(missingSetEngineMessage)
		if ("default" in this.inner) {
			// a default of undefined would replace undefined with itself
			assertDefaultValueAssignability(
				this.requiredValue,
				this.inner.default,
				this.key,
				this
			)
		}
		// a function default can fail as it's applied, like a morph
		this.hasMorph ||= typeof this.inner.default === "function"
		this.ctxMorph ||= this.defMorph?.length === 2
	}

	override getIo(ioKind: "in" | "out"): BaseNode {
		if (ioKind === "out" || !this.hasDef()) return super.getIo(ioKind)
		return this.$.node(
			"optional",
			{ key: this.key, value: this.value._in },
			{ reduced: true }
		)
	}

	private _requiredValue: BaseRoot | undefined
	/**
	 * its value where its key is required, which without
	 * exactOptionalPropertyTypes drops the undefined its key allowed, as
	 * TS's `-?` does
	 */
	get requiredValue(): BaseRoot {
		return (this._requiredValue ??=
			this.$.cfg.exactOptionalPropertyTypes === false ?
				withoutUndefined(this.value)
			:	this.value)
	}

	private _outProp: Prop.Node | undefined
	// a default replaces undefined where it's allowed, so it's not output
	get outProp(): Prop.Node {
		if (!this.hasDef()) return this
		const { default: defaultValue, ...requiredInner } = this.inner

		return (this._outProp ??= this.$.node(
			"required",
			{ ...requiredInner, value: this.requiredValue },
			{ reduced: true }
		) as never)
	}

	get expression(): string {
		return (this.c.expression ??= composing(() =>
			this.hasDef() ?
				`${this.keyStr}: ${elided(this.value.expression)} = ${printable(this.inner.default, { ownDataOnly: true })}`
			:	`${this.keyStr}?: ${elided(this.value.expression)}`
		))
	}

	/** the morph writing its default when its key is missing */
	defMorph: Morph | undefined =
		this.hasDef() ?
			computeDefaultValueMorph(this.key, this.requiredValue, this.default)
		:	undefined

	// without exactOptionalPropertyTypes, a default replaces undefined too
	readonly defaultsUndefined: boolean =
		this.hasDef() && this.$.cfg.exactOptionalPropertyTypes === false

	// an undefined its default replaces is no value
	override holdsValue(data: object): boolean {
		return this.defaultsUndefined ?
				(data as Record<PropertyKey, unknown>)[this.key] !== undefined
			:	this.key in data
	}

	override jsHoldsValue(js: NodeCompiler, data: string): string {
		return this.defaultsUndefined ?
				`${data}${js.prop(this.key)} !== undefined`
			:	super.jsHoldsValue(js, data)
	}
}

export const Optional = {
	impl: implementation,
	Node: OptionalNode
}

/**
 * `value` without its undefined branch, the one exactOptionalPropertyTypes:
 * false adds to an optional key or element's value, where a `-?` drops it. A
 * value like `unknown` allowing undefined otherwise keeps it, as in TS
 */
export const withoutUndefined = (value: BaseRoot): BaseRoot => {
	const branches = value.branches.filter(branch => !branch.hasUnit(undefined))
	if (branches.length === value.branches.length) return value
	return value.$.node("union", {
		branches,
		...(value.is("union") && value.ordered ? { ordered: true } : {})
	})
}

export const assertDefaultValueAssignability = (
	node: BaseRoot,
	value: unknown,
	key: PropertyKey | null,
	owner?: BaseNode
): unknown => {
	// a function default is checked each time it's applied
	if (isThunk(value)) return value

	if (hasDomain(value, "object"))
		throwParseError(writeNonPrimitiveNonFunctionDefaultValueMessage(key))

	return checkDefault(node, value, key, owner)
}

// unlike its input, a thunk's result may be an object
export const checkDefault = (
	node: BaseRoot,
	value: unknown,
	key: PropertyKey | null,
	// the node whose creation checks it, if any
	owner?: BaseNode
): unknown => {
	if (!isResolutionFinal() && node.hasAlias) {
		queueUnchecked(() => checkDefault(node, value, key, owner))
		return value
	}

	if ($ark.deferDefaultCheck?.(node, value, key, owner)) return value

	// if the node has a default value, finalize it and apply JIT optimizations
	// if applicable to ensure behavior + error logging is externally consistent
	// (using .in here instead of ._in triggers finalization)
	const out = (node.in as BaseRoot).traverseUnused(value)

	if (out instanceof ArkErrors) {
		const errors =
			node.meta.description !== undefined && node.alters ?
				inputErrors(node, value)
			:	out
		// a ParseError is for the developer, so it renders in English
		const en = $ark.defaultConfig.locale

		if (key === null) {
			// e.g. "Default must be assignable to number (was string)"
			throwParseError(`Default ${errors.toLocaleString(en)}`)
		}

		const atPath = new ArkErrors(node.$.cfg)
		atPath._merge(errors, [key])

		// e.g. "Default for bar must be assignable to number (was string)"
		// e.g. "Default for value at [0] must be assignable to number (was string)"
		throwParseError(`Default for ${atPath.toLocaleString(en)}`)
	}

	return value
}

// a default is easily mistaken for a morph's output, so a rejected one reports
// what its input checks
const inputErrors = (node: BaseRoot, value: unknown): ArkErrors =>
	(node.in as BaseRoot)
		.configure(meta =>
			meta.description === node.meta.description ?
				omit(meta, { description: 1 })
			:	meta
		)
		.traverseUnused(value) as ArkErrors

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
