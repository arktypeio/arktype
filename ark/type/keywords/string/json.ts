import { rootNode } from "@ark/schema"

const isParsableJson = (s: string) => {
	try {
		JSON.parse(s)
		return true
	} catch {
		return false
	}
}

const json = rootNode({
	domain: "string",
	predicate: {
		meta: "a JSON string",
		predicate: isParsableJson
	}
})

const parsejson = rootNode({
	in: "string",
	morphs: (s: string, ctx): object => {
		try {
			return JSON.parse(s)
		} catch {
			return ctx.error("a valid JSON string")
		}
	}
})
