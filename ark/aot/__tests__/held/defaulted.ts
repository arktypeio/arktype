import { type } from "arktype"

// arktype orders props by key, so their thunks' names don't order them
export const Settings = type({
	tags: ["string[]", "=", () => []],
	ids: ["number[]", "=", () => []]
})
