import { type } from "arktype"

const group = type({
	name: "string",
	userIds: "(string | number)[]"
})

export const out = group({
	name: "TS Validators",
	userIds: ["ssalbdivad", "colinhacks", "FabianHiller"]
})
