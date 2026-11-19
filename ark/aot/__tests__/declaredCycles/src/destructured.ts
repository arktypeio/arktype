import { scope } from "arktype"

export const { post, author } = scope({
	post: { title: "string", author: "author" },
	author: { name: "string", "posts?": "post[]" }
}).export()
