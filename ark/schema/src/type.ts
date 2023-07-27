import type { CheckResult } from "../compiler/traverse.js"
import type { Predicate } from "./predicates/predicate.js"
import type { extractOut } from "./type.js"

export type Type<t = unknown, $ = any> = {
	(data: unknown): CheckResult<extractOut<t>>
	branches: readonly Predicate[]
}
