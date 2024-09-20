import type { Predicate, of } from "../inference.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type digits = of<string, Predicate<"digits">>
}

export const digits = regexStringNode(/^\d*$/, "only digits 0-9")

export type digits = string.digits
