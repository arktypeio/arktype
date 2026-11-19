import { scope, type } from "arktype"

// other scopes' `user`
export const admins = scope({
	user: { role: "'admin'", "reports?": "user[]" }
}).export()

export const guests = scope({
	user: { "invitedBy?": "user" }
}).export()

export const Dashed = scope({ "the-link": { "next?": "the-link" } }).type({
	head: "the-link"
})

export const Keyword = scope({
	new: { value: "boolean", "child?": "new" }
}).type({ root: "new" })

export const $ = scope({
	"#node": { value: "number", "next?": "node" },
	list: { head: "node" }
})

export const Tree = type({ value: "number", "children?": "this[]" })
