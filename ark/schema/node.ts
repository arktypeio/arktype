import type { extend } from "@arktype/util"
import { DynamicBase, entriesOf, fromEntries, isArray } from "@arktype/util"
import { AttributeNode } from "./attributes/attribute.js"
import type { DescriptionAttribute } from "./attributes/description.js"
import type { ConstraintDefinitions } from "./constraints/constraint.js"
import type { TypeDefinitions } from "./types/type.js"

export type NodeDefinitionsByKind = extend<
	TypeDefinitions,
	ConstraintDefinitions
>

export type NodesByKind = {
	[k in NodeKind]: InstanceType<NodeDefinitionsByKind[k]>
}

export type NodeKind = keyof NodeDefinitionsByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]

export interface BaseAttributes {
	readonly description?: DescriptionAttribute
	readonly alias?: DescriptionAttribute
}

// @ts-expect-error
export abstract class BaseNode<
	rules extends {} = {},
	attributes extends BaseAttributes = BaseAttributes
> extends DynamicBase<rules & attributes> {
	readonly rules: rules
	readonly ruleEntries: entriesOf<rules> = []
	readonly attributes: attributes
	readonly attributeEntries: entriesOf<attributes> = []

	constructor(input: rules & attributes) {
		super(input)
		for (const entry of entriesOf(input)) {
			if (
				entry[1] instanceof AttributeNode ||
				// instanceof doesn't care whether it's an object anyways
				(isArray(entry[1]) && (entry[1][0] as any) instanceof AttributeNode)
			) {
				this.attributeEntries.push(entry as never)
			} else {
				this.ruleEntries.push(entry as never)
			}
		}
		this.rules = fromEntries(this.ruleEntries) as rules
		this.attributes = fromEntries(this.attributeEntries) as attributes
	}

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
