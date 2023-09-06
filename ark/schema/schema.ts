import type { AbstractableConstructor, exact, listable } from "@arktype/util"
import type { NonEnumerableDomain } from "./bases/domain.js"
import type { BoundSet, Narrow } from "./main.js"
import type { CastTo } from "./utils.js"

export type SchemaDefinition = listable<PredicateDefinition>

export type ConstraintDefinition<rule> = rule | ConstraintDefinitionObject<rule>

type ConstraintDefinitionObject<rule> = {
	rule: rule
	description?: string
}

export type DomainDefinition<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = ConstraintDefinition<domain>

type DomainBasis<domain extends NonEnumerableDomain = NonEnumerableDomain> = {
	domain: DomainDefinition<domain>
}

export type PrototypeDefinition<
	constructor extends AbstractableConstructor = AbstractableConstructor
> = ConstraintDefinition<constructor>

type PrototypeBasis<
	constructor extends AbstractableConstructor = AbstractableConstructor
> = {
	prototype: PrototypeDefinition<constructor>
}

export type IdentityDefinition<value = unknown> = ConstraintDefinition<value>

type IdentityBasis<identity = unknown> = {
	identity: IdentityDefinition<identity>
}

export type BasisDefinition = DomainBasis | PrototypeBasis | IdentityBasis

export interface NarrowablePredicate {
	narrows?: NarrowDefinition
}

export interface NumberPredicate extends NarrowablePredicate {
	divisor?: DivisorDefinition
	bounds?: BoundSet
}

export type RefinementsFor<def> = def extends IdentityBasis
	? {}
	: def extends DomainBasis<"number">
	? {}
	: {}

export type DivisorDefinition = ConstraintDefinition<number>

export type BoundsDefinition = ConstraintDefinition<BoundSet>

export type NarrowDefinition = ConstraintDefinition<listable<Narrow>>

export type RegexDefinition = ConstraintDefinition<listable<RegExp>>

export type PredicateDefinition =
	| Record<PropertyKey, never>
	| IdentityBasis
	| { domain: DomainDefinition<"number">; divisor?: DivisorDefinition }
	| { domain: DomainDefinition<"string">; regex?: RegexDefinition }

export type TypeSchema<t = unknown> = CastTo<t>

export const schema = <const branches extends readonly PredicateDefinition[]>(
	...branches: {
		[i in keyof branches]: exact<
			branches[i],
			PredicateDefinition & { domain: branches[i & keyof branches] }
		>
	}
) => branches

// export type inferBranches<branches extends readonly PredicateDefinition[]> = {
// 	[i in keyof branches]: inferPredicateDefinition<branches[i]>
// }[number]

const predicate: PredicateDefinition = { domain: "number", divisor: 5 }

// const t = schema(
// 	//    ^?
// 	{ domain: "number", divisor: 5 },
// 	{ domain: "number", regex: /.*/ }
// ) //=>
