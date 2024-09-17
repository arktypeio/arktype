import type { Branded, constrain } from "../inference.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type alpha = constrain<string, Branded<"alpha">>
}

export const alpha = regexStringNode(/^[A-Za-z]*$/, "only letters")

export type alpha = string.alpha
