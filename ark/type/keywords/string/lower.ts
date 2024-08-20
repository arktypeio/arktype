import { rootNode } from "@ark/schema"
import type { Branded, constrain, Out } from "../ast.ts"
import { regexStringNode } from "./utils.ts"

declare namespace string {
	export type prelower = constrain<string, Branded<"prelower">>
}

export const prelower = regexStringNode(/^[a-z]*$/, "only prelower letters")

export type prelower = string.prelower

export type lower = (In: string) => Out<string.prelower>

export const lower = rootNode({
	in: "string",
	morphs: (s: string) => s.toLowerCase()
})
