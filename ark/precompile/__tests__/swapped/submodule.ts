import { scope } from "arktype"
import { separateModule } from "./containers.ts"

// a mock can swap it for a Module nesting the same Types otherwise
export const Sub = scope({ sub: separateModule }).type({
	x: "sub.c",
	y: "sub.a.b"
})
