import { mutable } from "@arktype/util"
import { Disjoint } from "../disjoint.js"

export interface ConstraintRule {
	description?: string
}

type ConstraintSubclass<def extends ConstraintRule = ConstraintRule> = {
	new (def: def): ConstraintNode<def> & def

	writeDefaultDescription(def: def): string
}

export abstract class ConstraintNode<
	rule extends ConstraintRule = ConstraintRule,
	subclass extends ConstraintSubclass<rule> = ConstraintSubclass<rule>
> {
	private readonly subclass: subclass = Object.getPrototypeOf(this).constructor
	readonly description: string

	constructor(public rule: rule) {
		this.description =
			rule.description ?? this.subclass.writeDefaultDescription(rule)
	}

	intersect(other: InstanceType<subclass>) {
		const result = this.intersectOwnKeys(other)
		if (result === null || result instanceof Disjoint) {
			// Ensure the signature of this method reflects whether Disjoint and/or null
			// are possible intersection results for the subclass.
			return result as Exclude<
				ReturnType<InstanceType<subclass>["intersectOwnKeys"]>,
				rule
			>
		}
		if (this.rule.description) {
			if (other.rule.description) {
				result.description = this.rule.description.includes(
					other.rule.description
				)
					? this.rule.description
					: other.rule.description.includes(this.rule.description)
					? other.rule.description
					: `${this.rule.description} and ${other.rule.description}`
			} else {
				result.description = this.rule.description
			}
		} else if (other.rule.description) {
			result.description = other.rule.description
		}
		return new this.subclass(result) as InstanceType<subclass>
	}

	abstract intersectOwnKeys(
		other: InstanceType<subclass>
	): rule | Disjoint | null
}

export const ReadonlyArray = Array as unknown as new <
	T extends readonly unknown[]
>(
	...args: T
) => T

type ConstraintList = readonly ConstraintNode<any, any>[]

/** @ts-expect-error allow extending narrowed readonly array */
export class ConstraintSet<
	constraints extends ConstraintList = ConstraintList
> extends ReadonlyArray<constraints> {
	// TODO: make sure in cases like range, the result is sorted
	add(constraint: constraints[number]): ConstraintSet<constraints> | Disjoint {
		const result = [] as unknown as mutable<constraints>
		let includesConstraint = false
		for (let i = 0; i < this.length; i++) {
			const elementResult = this[i].intersect(constraint)
			if (elementResult === null) {
				result.push(this[i])
			} else if (elementResult instanceof Disjoint) {
				return elementResult
			} else {
				result.push(elementResult)
				includesConstraint = true
			}
		}
		if (!includesConstraint) {
			result.push(constraint)
		}
		return new ConstraintSet(...result)
	}
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
