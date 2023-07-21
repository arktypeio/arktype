import { Disjoint } from "../disjoint.js"

export interface Constraint {
	description?: string
}

export const ReadonlyObject = Object as unknown as new <T extends object>(
	base: T
) => T

export abstract class ConstraintNode<
	constraint extends Constraint = Constraint,
	subclass extends ConstraintNode = ConstraintNode<constraint, any>
> {
	abstract readonly id: string
	abstract readonly description: string

	constructor(public constraint: constraint) {}

	intersect(other: subclass) {
		const intersection = this.intersectConstraints(other)
		if (intersection === null || intersection instanceof Disjoint) {
			return intersection
		}
		if (this.constraint.description) {
			if (other.constraint.description) {
				intersection.description = `${this.constraint.description} and ${other.constraint.description}`
			} else {
				intersection.description = this.constraint.description
			}
		} else if (other.constraint.description) {
			intersection.description = other.constraint.description
		}
		return
	}

	protected abstract intersectConstraints(
		other: subclass
	): constraint | Disjoint | null
}

export type ConstraintList = readonly Constraint[]

export const ReadonlyArray = Array as unknown as new <
	T extends readonly unknown[]
>(
	...args: T
) => T

/** @ts-expect-error allow extending narrowed readonly array */
export class ConstraintSet<
	constraints extends ConstraintNode[] = ConstraintNode[]
> extends ReadonlyArray<constraints> {
	// TODO: make sure in cases like range, the result is sorted
	add(constraint: constraints[number]): ConstraintSet<constraints> | Disjoint {
		const result = [] as unknown as constraints
		for (let i = 0; i < this.length; i++) {
			const elementResult = this[i].intersectConstraints(constraint)
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
