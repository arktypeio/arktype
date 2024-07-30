import { defineRoot } from "@ark/schema"
import type { Out } from "../ast.js"
import type { Module } from "../module.js"
import { scope } from "../scope.js"

const trim = defineRoot({
	in: "string",
	morphs: (s: string) => s.trim()
})

const uppercase = defineRoot({
	in: "string",
	morphs: (s: string) => s.toUpperCase()
})

const lowercase = defineRoot({
	in: "string",
	morphs: (s: string) => s.toLowerCase()
})

export type formattingExports = {
	trim: (In: string) => Out<string>
	uppercase: (In: string) => Out<string>
	lowercase: (In: string) => Out<string>
}
export type formatting = Module<formattingExports>

export const formatting: formatting = scope({
	trim,
	uppercase,
	lowercase
}).export()
