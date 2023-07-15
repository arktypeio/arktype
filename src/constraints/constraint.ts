import type { List } from "@arktype/utils"

export interface Constraint {
    description?: string
}

export abstract class ConstraintGroup<
    group extends List<Constraint> = List<Constraint>
> extends Array<Constraint> {
    abstract intersect(constraint: group[number]): this
}

export type ConstraintList = readonly Constraint[]

export type SetMethods<constraints extends ConstraintList> = {
    add: (
        this: ConstraintSet<constraints>,
        constraint: constraints[number]
    ) => constraints
}

export type ConstraintSet<constraints extends ConstraintList = ConstraintList> =
    constraints & SetMethods<constraints>

export const defineConstraintSet =
    <constraints extends ConstraintList>(methods: SetMethods<constraints>) =>
    (constraints: constraints) =>
        Object.assign(constraints, methods)

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
