import type { SchemaModule } from "../module.js"
import type { Out } from "../roots/morph.js"
import { root, schemaScope } from "../scope.js"

const trim = root.defineRoot({
	in: "string",
	morphs: (s: string) => s.trim()
})

const uppercase = root.defineRoot({
	in: "string",
	morphs: (s: string) => s.toUpperCase()
})

const lowercase = root.defineRoot({
	in: "string",
	morphs: (s: string) => s.toLowerCase()
})

export type formattingExports = {
	trim: (In: string) => Out<string>
	uppercase: (In: string) => Out<string>
	lowercase: (In: string) => Out<string>
}
export type formatting = SchemaModule<formattingExports>

export const formatting: formatting = schemaScope({
	trim,
	uppercase,
	lowercase
}).export()
