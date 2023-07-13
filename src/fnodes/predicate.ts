import type { AbstractableConstructor, Domain, evaluate } from "@arktype/utils"
import type { Bound } from "../nodes/primitive/bound.js"
import type { TypeNode } from "../nodes/type.js"
import type { Narrow } from "../parser/tuple.js"
import type { SerializedRegexLiteral } from "./regex.js"

export type Union = readonly [] | readonly [Predicate, ...Predicate[]]

export type Predicate = Readonly<{
    basis?: readonly [BasisConstraint]
    range?:
        | readonly [RangeConstraint]
        | readonly [RangeConstraint, RangeConstraint]
    divisor?: readonly [DivisorConstraint]
    pattern?: readonly PatternConstraint[]
    narrow?: readonly NarrowConstraint[]
    prop?: readonly PropConstraint[]
    signature?: readonly SignatureConstraint[]
    element?: readonly ElementConstraint[]
}>

export type PropConstraint = defineConstraint<{
    kind: "prop"
    key: string | symbol
    required: boolean
    value: TypeNode
}>

export type SignatureConstraint = defineConstraint<{
    kind: "signature"
    key: TypeNode
    value: TypeNode
}>

export type ElementConstraint = defineConstraint<{
    kind: "element"
    groups: readonly ElementGroup[]
}>

type ElementGroup = Readonly<{
    variadic: boolean
    value: TypeNode
}>

type CommonConstraintProps = {
    description?: string
}

type BaseConstraint = {
    kind: string
}

type defineConstraint<constraint extends BaseConstraint> = evaluate<
    Readonly<constraint & CommonConstraintProps>
>

export type BasisConstraint =
    | DomainConstraint
    | UnitConstraint
    | PrototypeConstraint

export type DomainConstraint = defineConstraint<{
    kind: "domain"
    rule: Domain
}>

export type UnitConstraint = defineConstraint<{
    kind: "unit"
    rule: unknown
}>

export type PrototypeConstraint = defineConstraint<{
    kind: "prototype"
    rule: AbstractableConstructor
}>

export type DivisorConstraint = defineConstraint<{
    kind: "divisor"
    rule: number
}>

export type PatternConstraint = defineConstraint<{
    kind: "pattern"
    rule: SerializedRegexLiteral
}>

export type NarrowConstraint = defineConstraint<{
    kind: "narrow"
    rule: Narrow
}>

export type RangeConstraint = defineConstraint<{
    kind: "range"
    rule: Bound
}>
