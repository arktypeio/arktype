import { type } from "arktype"

type({
	"test?": type("string").pipe(x => x === "true")
})
