import { rootNode } from "@ark/schema"
import type { Out } from "../ast.js"
import type { Module } from "../module.js"
import { scope } from "../scope.js"

const trim = rootNode({
	in: "string",
	morphs: (s: string) => s.trim()
})

const uppercase = rootNode({
	in: "string",
	morphs: (s: string) => s.toUpperCase()
})

const lowercase = rootNode({
	in: "string",
	morphs: (s: string) => s.toLowerCase()
})

const capitalize = rootNode({
	in: "string",
	morphs: (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
})

export type formattingExports = {
	trim: (In: string) => Out<string>
	uppercase: (In: string) => Out<string>
	lowercase: (In: string) => Out<string>
	capitalize: (In: string) => Out<string>
}
export type formatting = Module<formattingExports>

export const formatting: formatting = scope(
	{
		trim,
		uppercase,
		lowercase,
		capitalize
	},
	{
		prereducedAliases: true
	}
).export()
