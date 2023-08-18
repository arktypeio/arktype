import { AliasAttribute } from "./alias.js"
import { DescriptionAttribute } from "./description.js"
import { MorphAttribute } from "./morph.js"

export const attributeDefinitions = {
	description: DescriptionAttribute,
	alias: AliasAttribute,
	morph: MorphAttribute
}

export type AttributeDefinitions = typeof attributeDefinitions

export type AttributeKind = keyof AttributeDefinitions

export type Attribute<kind extends AttributeKind = AttributeKind> =
	InstanceType<AttributeDefinitions[kind]>

export type AttributeSets = satisfy<
	{
		[kind in AttributeKind]: listable<AttributeNode<kind>>
	},
	{
		prop: PropAttribute
		identity: IdentityAttribute
		domain: DomainAttribute
		instanceOf: InstanceOfAttribute
		divisor: DivisorAttribute
		range: RangeAttributeSet
		pattern: readonly PatternAttribute[]
		narrow: readonly NarrowAttribute[]
	}
>

export type AttributeSet<kind extends AttributeKind = AttributeKind> =
	AttributeSets[kind]

export abstract class AttributeNode<value = unknown> {
	constructor(public value: value) {}

	intersect(other: this) {
		return new (this.constructor as any)(this.intersectValues(other)) as this
	}

	abstract intersectValues(other: this): value
}
