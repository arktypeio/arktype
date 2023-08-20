import type {
	Dict,
	evaluate,
	extend,
	merge,
	mergeAll,
	nominal
} from "@arktype/util"
import type { DescriptionNode } from "./rules/description.js"
import type { RuleDefinitions } from "./rules/rule.js"
import type { TypeDefinitions } from "./types/type.js"

export type NodeDefinitionsByKind = extend<TypeDefinitions, RuleDefinitions>

export type NodesByKind = {
	[k in NodeKind]: InstanceType<NodeDefinitionsByKind[k]>
}

export type NodeKind = keyof NodeDefinitionsByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]

export type NodeKeyMap<definitionKey extends PropertyKey = PropertyKey> = {
	[k in definitionKey]?: NodeKind | LeafRule
}

export interface NodeImplementation {
	kind: string
	writeDefaultDescription(): string
}

export type LeafRule<t = unknown> = nominal<t, "leaf">

export const leafRule = <t>() => null as unknown as LeafRule<t>

export type mapKeys<keymap extends NodeKeyMap> = {
	[k in keyof keymap]: keymap[k] extends LeafRule<infer t> ? t : never
}

export abstract class BaseNode {
	declare readonly id: string
	declare allows: (data: unknown) => boolean

	abstract readonly kind: NodeKind

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	equals(other: BaseNode) {
		return this.id === other.id
	}
}

type composeTraits<
	base extends Base,
	traits extends readonly Trait[]
> = traits extends readonly [
	infer head extends Trait,
	...infer tail extends readonly Trait[]
]
	? composeTraits<base & ReturnType<head>, tail>
	: base

export type Base<instance = object> = abstract new (...args: any[]) => instance

export type Trait<instance = object> = (base: Base<instance>) => Base<instance>

// const composeNode = <traits extends readonly Trait[]>(...traits: traits) => traits.length === 1 ?

const compose = <base extends Base, traits extends readonly Trait[]>(
	base: base,
	...traits: traits
) =>
	traits.reduce((base, trait) => {
		abstract class extended extends base {
			constructor(...args: any[]) {
				super(...args)
				trait.apply(this, args)
			}
		}
		return extended
	}, base) as {} as composeTraits<base, traits>

const z = compose(BaseNode, Describable)

type FFF = InstanceType<typeof z>

class Divisor extends compose(BaseNode, Describable) {
	constructor(input: number) {
		super()
		// return typeof input === "number" ? { value: input } : input
	}

	readonly kind = "divisor"

	writeDefaultDescription() {
		return this.value === 1 ? "an integer" : `a multiple of ${this.value}`
	}
}

const divisor = new Divisor(5)

// export const BaseChildren = {
// 	description: "description",
// 	alias: "alias"
// } satisfies NodeKeyMap

// export interface NodeSubclass<instance> {
// 	new (input: unknown): instance
// 	readonly keymap: NodeKeyMap<keyof instance>
// }
