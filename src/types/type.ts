import type { CheckResult } from "../compiler/traverse.js"
import type { extractOut } from "../type.js"
import type { Predicate } from "./predicate.js"

export type Type<t = unknown, $ = any> = {
	(data: unknown): CheckResult<extractOut<t>>
	branches: readonly Predicate[]
}
