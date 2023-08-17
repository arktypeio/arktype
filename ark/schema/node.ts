import type { extend } from "@arktype/util"
import { DynamicBase, entriesOf, fromEntries, isArray } from "@arktype/util"
import { Attribute } from "./attributes/attribute.js"
import type { DescriptionAttribute } from "./attributes/description.js"
import type { ConstraintsByKind } from "./constraints/constraint.js"
import type { TypesByKind } from "./types/type.js"

export type NodesByKind = extend<TypesByKind, ConstraintsByKind>

export type NodeKind = keyof NodesByKind

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

	protected constructor(input: rules & attributes) {
		super(input)
		for (const entry of entriesOf(input)) {
			if (
				entry[1] instanceof Attribute ||
				// instanceof doesn't care whether it's an object anyways
				(isArray(entry[1]) && (entry[1][0] as any) instanceof Attribute)
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
