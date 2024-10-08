import type { Predicate, of } from "../inference.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type alpha = of<string, Predicate<"alpha">>
}

export const alpha = regexStringNode(/^[A-Za-z]*$/, "only letters")

export type alpha = string.alpha
