export interface Constraint {
	description?: string
}

export const ReadonlyObject = Object as unknown as new <T extends object>(
	base: T
) => T

/** @ts-expect-error allow extending narrowed readonly object */
export abstract class ConstraintNode<
	constraint extends Constraint
> extends ReadonlyObject<constraint> {
	constructor(constraint: constraint) {
		super(constraint)
	}

	abstract readonly condition: string
	abstract readonly defaultDescription: string
}

export type ConstraintList = readonly Constraint[]

export const ReadonlyArray = Array as unknown as new <
	T extends readonly unknown[]
>(
	...args: T
) => T

/** @ts-expect-error allow extending narrowed readonly array */
export abstract class ConstraintSet<
	constraints extends readonly Constraint[]
> extends ReadonlyArray<constraints> {
	abstract intersect(constraint: constraints[number]): constraints
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
