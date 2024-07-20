import { scope, type } from "arktype"

const types = scope({
	dict: "Record<string, unknown>",
	user: {
		name: "string",
		"age?": "number",
		address: "string"
	},
	homelessUser: "Pick<user, 'name' | 'address'>"
}).export()
