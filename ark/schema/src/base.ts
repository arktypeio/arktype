import { ReadonlyObject } from "@arktype/util"
import { Disjoint } from "./disjoint.js"

export type NodeSubclass<
	constraints extends BaseConstraints,
	attributes extends BaseAttributes
> = {
	new (
		constraints: constraints,
		attributes: attributes
	): BaseNode<any, any, any>

	writeDefaultDescription(rule: constraints): string

	intersectConstraints(
		l: constraints,
		r: constraints
	): constraints | Disjoint | null

	intersectAttributes(l: attributes, r: attributes): attributes
}

export type BaseConstraints = {}

export type BaseAttributes = {
	description?: string
}

/** @ts-expect-error allow subclasses to access rule keys as top-level properties */
export abstract class BaseNode<
	subclass extends NodeSubclass<constraints, attributes>,
	constraints extends BaseConstraints,
	attributes extends BaseAttributes
> extends ReadonlyObject<constraints> {
	private readonly subclass = this.constructor as subclass

	readonly constraints: constraints
	readonly attributes: attributes

	declare readonly id: string

	constructor(constraints: constraints, attributes = {} as attributes) {
		if (constraints instanceof BaseNode) {
			// avoid including non-constraint keys in rule
			constraints = constraints.constraints
		}
		super({ ...constraints })
		this.constraints = constraints
		this.attributes = attributes
		this.description = this.subclass.writeDefaultDescription(constraints)
	}

	equals(other: InstanceType<subclass>) {
		return this.id === other.id
	}

	intersect(other: InstanceType<subclass>) {
		const result = this.intersectConstraints(other)
		if (result === null || result instanceof Disjoint) {
			// Ensure the signature of this method reflects whether Disjoint and/or null
			// are possible intersection results for the subclass.
			return result as Exclude<
				ReturnType<InstanceType<subclass>["intersectConstraints"]>,
				constraints
			>
		}
		return new this.subclass(result) as InstanceType<subclass>
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
