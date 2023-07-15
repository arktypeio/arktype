import type { List } from "@arktype/utils"

export interface Constraint {
    description?: string
}

type NodeMethods<constraint extends Constraint = Constraint> = {
    get condition(): string
    get defaultDescription(): string
} & ThisType<ConstraintNode<constraint>>

export type ConstraintNode<constraint extends Constraint = Constraint> =
    constraint & NodeMethods<constraint>

export const defineConstraintNode =
    <constraint extends Constraint>(methods: NodeMethods<constraint>) =>
    (constraint: constraint) =>
        Object.assign(constraint, methods)

export type ConstraintList = readonly Constraint[]

export const ReadonlyArray = Array as unknown as new <
    T extends readonly unknown[]
>(
    ...args: T
) => T

/** @ts-expect-error Allow extending narrowed readonly array */
export abstract class ConstraintSet<
    constraints extends readonly Constraint[]
> extends ReadonlyArray<constraints> {
    abstract add(constraint: constraints[number]): constraints
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
