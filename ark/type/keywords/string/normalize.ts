import { rootNode } from "@ark/schema"
import type { Branded, constrain, Out } from "../../ast.ts"
import { regexStringNode } from "./utils.ts"

namespace string {
	export type normalized = constrain<string, Branded<"normalized">>
}

export const normalized = regexStringNode(
	/^\S*$/,
	"a string without leading or trailing whitespace"
)

export type normalized = string.normalized

export type toNormalized = (In: string) => Out<string.normalized>

export const toNormalized = rootNode({
	in: "string",
	morphs: (s: string) => s.normalize()
})
