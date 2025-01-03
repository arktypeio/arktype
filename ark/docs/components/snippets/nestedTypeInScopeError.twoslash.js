// @errors: 2322
import { scope } from "arktype"
// ---cut---
const myScope = scope({
	id: "string#id",
	user: type({
		name: "string",
		id: "id"
	})
})
