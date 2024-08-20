import { type } from "arktype"

const user = type({
	username: "string"
})

const endpoint = type({
	username: "string"
}).pipe(({ username }) => ({ username }), user)
