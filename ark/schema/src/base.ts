import { ReadonlyObject } from "@arktype/util"
import type { Disjoint } from "./disjoint.js"

export type NodeSubclass<rule extends BaseRule = BaseRule> = {
	new (rule: rule): BaseNode<any, any>

	writeDefaultDescription(rule: rule): string
}

export interface BaseRule {
	description?: string
}

type PartialIntersector = (l: never, r: never) => BaseRule | Disjoint | null

const intersectNodes = (l: BaseNode, r: BaseNode) => {
	let description: string | undefined
	if (l.rule.description) {
		if (r.rule.description) {
			description = l.rule.description.includes(r.rule.description)
				? l.rule.description
				: r.rule.description.includes(l.rule.description)
				? r.rule.description
				: `${l.rule.description} and ${r.rule.description}`
		} else {
			description = l.rule.description
		}
	} else if (r.rule.description) {
		description = r.rule.description
	}
	return description ? { description } : {}
}

/** @ts-expect-error allow subclasses to access rule keys as top-level properties */
export abstract class BaseNode<
	rule extends BaseRule = BaseRule,
	subclass extends NodeSubclass<rule> = NodeSubclass<rule>
> extends ReadonlyObject<rule> {
	private readonly subclass = this.constructor as subclass

	declare readonly id: string

	protected static intersectors: readonly PartialIntersector[] = [
		intersectNodes
	]

	constructor(public rule: rule) {
		if (rule instanceof BaseNode) {
			return rule
		}
		super({ ...rule })
		this.description ??= this.subclass.writeDefaultDescription(rule)
	}

	equals(other: InstanceType<subclass>) {
		return this.id === other.id
	}

	intersect(other: InstanceType<subclass>) {
		let result = {} as rule
		for (const intersector of this.intersectors) {
			const partialResult = this.intersectors(this, other)
		}
	}

	abstract intersectOwnKeys(
		other: InstanceType<subclass>
	): rule | Disjoint | null
}

// const result = this.intersectOwnKeys(other)
// if (result === null || result instanceof Disjoint) {
// 	// Ensure the signature of this method reflects whether Disjoint and/or null
// 	// are possible intersection results for the subclass.
// 	return result as Exclude<
// 		ReturnType<InstanceType<subclass>["intersectOwnKeys"]>,
// 		rule
// 	>
// }

// type defineConstraint<constraint extends ConstraintGroup> = evaluate<
//     Readonly<constraint & CommonConstraintProps>
// >

// export type PropConstraint = defineConstraint<{
//     kind: "prop"
//     key: string | symbol
//     required: boolean
//     value: Type
// }>

// export type SignatureConstraint = defineConstraint<{
//     kind: "signature"
//     key: Type
//     value: Type
// }>

// export type BasisConstraint =
//     | DomainConstraint
//     | UnitConstraint
//     | PrototypeConstraint

// export type DomainConstraint = defineConstraint<{
//     kind: "domain"
//     rule: Domain
// }>

// export type UnitConstraint = defineConstraint<{
//     kind: "unit"
//     rule: unknown
// }>

// export type PrototypeConstraint = defineConstraint<{
//     kind: "prototype"
//     rule: AbstractableConstructor
// }>

// export type DivisorConstraint = defineConstraint<{
//     kind: "divisor"
//     rule: number
// }>

// export type PatternConstraint = defineConstraint<{
//     kind: "pattern"
//     rule: RegexRule
// }>

// type RegexRule = Readonly<{
//     source: string
//     flags: string
// }>

// export type NarrowConstraint = defineConstraint<{
//     kind: "narrow"
//     rule: Narrow
// }>

// export type RangeConstraint = defineConstraint<{
//     kind: "range"
//     rule: Bound
// }>
