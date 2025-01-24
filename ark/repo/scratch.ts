import { scope, type } from "arktype"

const user = type({
	name: "string",
	data: "number | (bigint | string)[]"
})

export type User = typeof user.infer

const badScope = scope({
	id: "string",
	// the global 'type' only knows about builtin keywords!
	badEntity: type({
		// TypeScript: 'id' is unresolvable
		id: "id"
	}),
	// reference scoped definitions directly instead of wrapping them
	goodEntity: {
		id: "id"
	}
})
