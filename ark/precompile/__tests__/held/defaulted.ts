import { type } from "arktype"

// arktype sorts an optional prop by its default before its key, so these sort by their thunks' names, which are equal
export const Settings = type({
	tags: ["string[]", "=", () => []],
	ids: ["number[]", "=", () => []]
})
