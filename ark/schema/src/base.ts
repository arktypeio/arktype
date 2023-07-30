import { ReadonlyObject } from "@arktype/util"
import { Disjoint } from "./disjoint.js"

export type NodeSubclass<rule extends BaseRule = BaseRule> = {
	new (rule: rule): BaseNode<any, any>

	writeDefaultDescription(rule: rule): string
}

export type BaseRule = {}

export type BaseAttributes = {
	description?: string
}

/** @ts-expect-error allow subclasses to access rule keys as top-level properties */
export abstract class BaseNode<
	constraints extends BaseRule = BaseRule,
	subclass extends NodeSubclass<constraints> = NodeSubclass<constraints>
> extends ReadonlyObject<constraints> {
	private readonly subclass = this.constructor as subclass

	declare readonly id: string

	constructor(
		public constraints: constraints,
		public attributes = {}
	) {
		if (constraints instanceof BaseNode) {
			// avoid including non-constraint keys in rule
			constraints = constraints.rule
		}
		super({ ...constraints })
		this.description = this.subclass.writeDefaultDescription(constraints)
	}

	equals(other: InstanceType<subclass>) {
		return this.id === other.id
	}

	intersect(other: InstanceType<subclass>) {
		const result = this.intersectOwnKeys(other)
		if (result === null || result instanceof Disjoint) {
			// Ensure the signature of this method reflects whether Disjoint and/or null
			// are possible intersection results for the subclass.
			return result as Exclude<
				ReturnType<InstanceType<subclass>["intersectOwnKeys"]>,
				constraints
			>
		}
		if (this.constraints.description) {
			if (other.constraints.description) {
				result.description = this.constraints.description.includes(
					other.constraints.description
				)
					? this.constraints.description
					: other.constraints.description.includes(this.constraints.description)
					? other.constraints.description
					: `${this.constraints.description} and ${other.constraints.description}`
			} else {
				result.description = this.constraints.description
			}
		} else if (other.constraints.description) {
			result.description = other.constraints.description
		}
		return new this.subclass(result) as InstanceType<subclass>
	}

	abstract intersectOwnKeys(
		other: InstanceType<subclass>
	): constraints | Disjoint | null
}

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
