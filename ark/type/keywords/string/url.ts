import { rootSchema } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { Branded, constrain, To } from "../ast.ts"
import { arkModule } from "../utils.ts"

declare namespace string {
	export type url = constrain<string, Branded<"url">>
}

const isParsableUrl = (s: string) => {
	if (URL.canParse as unknown) return URL.canParse(s)
	// Can be removed once Node 18 is EOL
	try {
		new URL(s)
		return true
	} catch {
		return false
	}
}

const root = rootSchema({
	domain: "string",
	predicate: {
		meta: "a URL string",
		predicate: isParsableUrl
	}
})

export const url: url.module = arkModule({
	root,
	parse: rootSchema({
		declaredIn: root as never,
		in: "string",
		morphs: (s: string, ctx) => {
			try {
				return new URL(s)
			} catch {
				return ctx.error("a URL string")
			}
		},
		declaredOut: rootSchema(URL)
	})
})

export declare namespace url {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: string.url
		parse: (In: string.url) => To<URL>
	}
}
