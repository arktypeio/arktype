import type { Dict, extend, nominal } from "@arktype/util"
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

export const defineNode =
	<input, keymap extends NodeKeyMap>(
		keys: keymap,
		parse: (input: input) => mapKeys<keymap>
	) =>
	<implementation extends NodeImplementation>(
		implementation: implementation & ThisType<implementation & mapKeys<keymap>>
	) =>
	(input: input | mapKeys<keymap>) =>
		({}) as extend<implementation, mapKeys<keymap>>

const Divisor = defineNode({ value: leafRule<number>() }, (input: number) =>
	typeof input === "number" ? { value: input } : input
)({
	kind: "divisor",
	writeDefaultDescription() {
		return this.value === 1 ? "an integer" : `a multiple of ${this.value}`
	}
})

export const BaseChildren = {
	description: "description",
	alias: "alias"
} satisfies NodeKeyMap

export interface NodeSubclass<instance> {
	new (input: unknown): instance
	readonly keymap: NodeKeyMap<keyof instance>
}

export abstract class BaseNode<
	subclass extends NodeSubclass<InstanceType<subclass>>
> {
	// readonly rules: rules
	// readonly ruleEntries: entriesOf<rules> = []
	// readonly attributes: attributes
	// readonly attributeEntries: entriesOf<attributes> = []

	// constructor(definition: { [k in keyof children]: children[k] extends NodeKind ? Node<children[k]> :  }) {
	// 	super(input)
	// 	// for (const entry of entriesOf(input)) {
	// 	// 	if (
	// 	// 		entry[1] instanceof AttributeNode ||
	// 	// 		// instanceof doesn't care whether it's an object anyways
	// 	// 		(isArray(entry[1]) && (entry[1][0] as any) instanceof AttributeNode)
	// 	// 	) {
	// 	// 		this.attributeEntries.push(entry as never)
	// 	// 	} else {
	// 	// 		this.ruleEntries.push(entry as never)
	// 	// 	}
	// 	// }
	// 	// this.rules = fromEntries(this.ruleEntries) as rules
	// 	// this.attributes = fromEntries(this.attributeEntries) as attributes
	// }

	abstract readonly kind: NodeKind
	declare readonly id: string
	declare allows: (data: unknown) => boolean

	abstract writeDefaultDescription(): string

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	equals(other: BaseNode) {
		return this.id === other.id
	}

	toString() {
		return this.description?.toString() ?? this.writeDefaultDescription()
	}
}
