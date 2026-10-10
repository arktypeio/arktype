import { configure } from "arktype/config"
import { describeDivisor } from "./describe.ts"

configure({
	onUndeclaredKey: "delete",
	divisor: { description: describeDivisor }
})
