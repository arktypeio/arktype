import { type } from "arktype"

const toDredge = (t: type.Any) => {
	if (t.extends("string")) return "string"
	if (t.extends("number")) return "number"
	if (t.extends("boolean")) return "boolean"
	if (t.extends("Date")) return "date"
	if (t.extends("Array")) return "array"
	if (t.extends("object")) return "object"
	return null
}
