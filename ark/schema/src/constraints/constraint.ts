import { Disjoint } from "../disjoint.js"

export interface ConstraintDefinition {
	description?: string
}

type ConstraintSubclass<def extends ConstraintDefinition> = new (
	definition: def
) => Constraint<def, ConstraintSubclass<def>>

export abstract class Constraint<
	def extends ConstraintDefinition = ConstraintDefinition,
	subclass extends ConstraintSubclass<def> = ConstraintSubclass<def>
> {
	abstract readonly description: string
	private readonly subclass: ConstraintSubclass<any> =
		Object.getPrototypeOf(this).constructor

	constructor(public definition: def) {}

	intersect(other: InstanceType<subclass>) {
		const result = this.intersectOwnKeys(other)
		if (result === null || result instanceof Disjoint) {
			// Ensure the signature of this method reflects whether Disjoint and/or null
			// are possible intersection results for the subclass.
			return result as Exclude<
				ReturnType<InstanceType<subclass>["intersectOwnKeys"]>,
				def
			>
		}
		if (this.definition.description) {
			if (other.definition.description) {
				result.description = this.definition.description.includes(
					other.definition.description
				)
					? this.definition.description
					: other.definition.description.includes(this.definition.description)
					? other.definition.description
					: `${this.definition.description} and ${other.definition.description}`
			} else {
				result.description = this.definition.description
			}
		} else if (other.definition.description) {
			result.description = other.definition.description
		}
		return new this.subclass(result) as InstanceType<subclass>
	}

	abstract intersectOwnKeys(
		other: InstanceType<subclass>
	): def | Disjoint | null
}

export const ReadonlyArray = Array as unknown as new <
	T extends readonly unknown[]
>(
	...args: T
) => T

/** @ts-expect-error allow extending narrowed readonly array */
export class ConstraintSet<
	constraints extends Constraint[] = Constraint[]
> extends ReadonlyArray<constraints> {
	// TODO: make sure in cases like range, the result is sorted
	add(constraint: constraints[number]): ConstraintSet<constraints> | Disjoint {
		const result = [] as unknown as constraints
		for (let i = 0; i < this.length; i++) {
			const elementResult = this[i].intersect(constraint)
			if (elementResult === null) {
				result.push(this[i])
			} else if (elementResult instanceof Disjoint) {
				return elementResult
			} else {
				result.push(elementResult, ...this.slice(i + 1))
				return new ConstraintSet(...result)
			}
		}
		result.push(constraint)
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
