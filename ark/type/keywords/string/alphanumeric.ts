import type { Branded, of } from "../inference.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type alphanumeric = of<string, Branded<"alphanumeric">>
}

export const alphanumeric = regexStringNode(
	/^[A-Za-z\d]*$/,
	"only letters and digits 0-9"
)

export type alphanumeric = string.alphanumeric
