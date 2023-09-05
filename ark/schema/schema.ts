import type { conform, exact, listable } from "@arktype/util"
import type { NonEnumerableDomain } from "./bases/domain.js"
import type { CastTo } from "./utils.js"

export type SchemaDefinition = listable<PredicateDefinition>

export type ConstraintDefinition<rule> =
	| rule
	| {
			rule: rule
			description?: string
	  }

export type DomainDefinition<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = ConstraintDefinition<domain>

export type DivisorDefinition = ConstraintDefinition<number>

export type RegexDefinition = ConstraintDefinition<RegExp>

export type PredicateDefinition =
	| Record<PropertyKey, never>
	| { domain: DomainDefinition }
	| { domain: DomainDefinition<"number">; divisor?: DivisorDefinition }
	| { domain: DomainDefinition<"string">; regex?: RegexDefinition }

export type TypeSchema<t = unknown> = CastTo<t>

export const schema = <const branches extends readonly PredicateDefinition[]>(
	...branches: conform<
		branches,
		{
			[i in keyof branches]: exact<
				branches[i],
				PredicateDefinition & { domain: branches[i & keyof branches] }
			>
		}
	>
) => branches

// export type inferBranches<branches extends readonly PredicateDefinition[]> = {
// 	[i in keyof branches]: inferPredicateDefinition<branches[i]>
// }[number]

const predicate: PredicateDefinition = { domain: "number", divisor: 5 }

const t = schema(
	//    ^?
	{ domain: "number", divisor: 5 },
	{ domain: "number", regex: /.*/ }
) //=>

// type Foo = { foo: true }

// type Bar = { bar: true }

// const foo = (a: Foo) => a
// const bar = (a: Bar) => a

// const operate = <f extends typeof foo | typeof bar>(
// 	f: f,
// 	input: Parameters<f>[0]
// ) => f(input)

// operate(f) // <- tacit
