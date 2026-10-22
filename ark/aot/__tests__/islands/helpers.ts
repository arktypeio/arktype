import { type } from "./ark.ts"

export const withId = (def: object) =>
	// @ark-runtime
	type({ id: "string.uuid" }).and(def)
