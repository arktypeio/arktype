import { type } from "arktype"

const t = type({
	"test?": type("string").pipe(x => x === "true")
})
