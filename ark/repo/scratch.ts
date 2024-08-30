import { scope, type } from "arktype"

const x = ["a", "b", "c"] as const
const myType = type({
	"optional?": type("===", ...x)
})
