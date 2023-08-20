import type { Dict, extend } from "@arktype/util"
import { DynamicBase, entriesOf, fromEntries, isArray } from "@arktype/util"
import { AliasNode } from "./rules/alias.js"
import { DescriptionNode } from "./rules/description.js"
import type { RuleDefinitions } from "./rules/rule.js"
import type { TypeDefinitions } from "./types/type.js"

export type NodeDefinitionsByKind = extend<TypeDefinitions, RuleDefinitions>

export type NodesByKind = {
	[k in NodeKind]: InstanceType<NodeDefinitionsByKind[k]>
}

export type NodeKind = keyof NodeDefinitionsByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]

export type NodeChildren = Record<string, NodeKind>

export const BaseChildren = {
	description: "description",
	alias: "alias"
} satisfies NodeChildren

export abstract class BaseNode<
	children extends NodeChildren = any //Record<string, null>
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
