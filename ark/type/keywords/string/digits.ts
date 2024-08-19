import type { Branded, constrain } from "../../ast.ts"
import { regexStringNode } from "./utils.ts"

namespace string {
	export type digits = constrain<string, Branded<"digits">>
}

export const digits = regexStringNode(/^\d*$/, "only digits 0-9")

export type digits = string.digits
