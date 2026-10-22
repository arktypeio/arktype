import { scope, type } from "arktype"

export const Dashed = scope({ link: { "next?": "link" } }).type({
	"the-head": "link"
})

export const Keyword = scope({
	tree: { value: "boolean", "child?": "tree" }
}).type({ string: "tree", default: "tree" })

export const object = type({ a: "string" })

export const Holder = type({ inner: object })

export const Nested = scope({
	list: { value: "number", "rest?": "list" },
	sub: scope({ leaf: "string" }).export()
}).export()
