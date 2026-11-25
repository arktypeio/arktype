import { scope, type } from "arktype"

export const User = type({
	name: "string",
	email: "string.email",
	tags: ["string", "[]"]
})

export const types = scope({ id: "string.uuid", user: { id: "id" } }).export()

const notADefinition = "string | number"
