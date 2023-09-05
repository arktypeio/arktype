import type { NonEnumerableDomain } from "./bases/domain.js"
import type { CastTo } from "./utils.js"

export type SchemaDefinition = {}

export type PredicateDefinition = {} | { domain: NonEnumerableDomain } | {}

export type TypeSchema<t = unknown> = CastTo<t>

export const schema = <input>(input: input): TypeSchema<unknown> =>
	({}) as never

export type inferSchema<schema> = {}
