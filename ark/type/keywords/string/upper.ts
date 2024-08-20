import { rootNode } from "@ark/schema"
import type { Branded, constrain, Out } from "../ast.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type preupper = constrain<string, Branded<"preupper">>
}

export type preupper = string.preupper

export const preupper = regexStringNode(/^[A-Z]*$/, "only upper letters")

export type upper = (In: string) => Out<string.preupper>

export const upper = rootNode({
	in: "string",
	morphs: (s: string) => s.toUpperCase()
})
