import { type } from "arktype"

// the build is given ARK_MODE as a define
export const Moded = type(
	process.env.ARK_MODE === "strict" ? "string" : "unknown"
)
