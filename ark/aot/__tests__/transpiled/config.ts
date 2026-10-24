import { configure } from "arktype/config"
import { describeDivisor } from "./describe.ts"
import { mode } from "./mode.ts"

configure({
	onUndeclaredKey: mode,
	divisor: { description: describeDivisor }
})
