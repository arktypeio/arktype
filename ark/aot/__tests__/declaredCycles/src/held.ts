import { scope, type } from "arktype"

export const schemas = {
	version: 2,
	types: scope({
		comment: { body: "string", "replies?": "comment[]" }
	}).export()
}

export const makeTree = () => type({ value: "number", "children?": "this[]" })
