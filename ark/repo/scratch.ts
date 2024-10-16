import { type } from "arktype"

const t = type({
	foo: type.keywords.string.uuid.v4.optional()
})
