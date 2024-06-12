import type { SchemaModule } from "../module.js"
import type { Out } from "../roots/morph.js"
import { root, schemaScope } from "../scope.js"

const trim = root.defineRoot({
	in: "string",
	morphs: (s: string) => s.trim()
})

export type formattingExports = {
	trim: (In: string) => Out<string>
}
export type formatting = SchemaModule<formattingExports>

export const formatting: formatting = schemaScope({
	trim
}).export()
