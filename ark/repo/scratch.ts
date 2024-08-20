import { type } from "arktype"

const user = type({
	username: "string"
})

const endpoint = type({
	apply: "string.trim",
	username: "string.lower",
	password: "string.toLower"
}).pipe(({ username }) => ({ username }), user)

"".toLowerCase()
