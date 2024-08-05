import { type, ark } from "arktype"

const t = type({
	foo: "liftArray<string>"
})

ark.liftArray
