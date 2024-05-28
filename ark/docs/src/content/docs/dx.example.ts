import { type } from "arktype"

const user = type({
	name: "string",
	"age?": "number"
})
