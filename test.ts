import { type } from "arktype"
import { declare } from "arktype/internal/scopes/ark.js"

const user = type({
	name: "string",
	age: "number",
	luckyNumbers: "(number|bigint)[]"
})
