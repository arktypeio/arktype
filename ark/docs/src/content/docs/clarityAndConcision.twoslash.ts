// @errors: 2322
import { type } from "arktype"
// ---cut---
// hover me
const user = type({
	name: "string",
	luckyNumbers: "number | bigint)[]",
	"isAdmin?": "boolean | null"
})
