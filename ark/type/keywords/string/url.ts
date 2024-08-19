import { rootNode } from "@ark/schema"
import type { Out, string } from "../../ast.ts"
import type { Submodule } from "../../module.ts"

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

const url = rootNode({
	domain: "string",
	predicate: {
		meta: "a URL string",
		predicate: isParsableUrl
	}
})

const parseurl = rootNode({
	in: arkString.submodule.url as never,
	morphs: (s: string): URL => new URL(s)
})

export type url = Submodule<{
	$root: string.url
	parse: (In: string.url) => Out<URL>
}>
