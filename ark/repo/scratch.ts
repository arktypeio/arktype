import { type } from "arktype"

export const pkg = type({
	name: "string",
	date: "string.date.iso",
	"metadata?": "string.json.parse",
	"tags?": "(number | string)[]"
})
