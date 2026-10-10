import "./config.ts"
import { type } from "arktype"

export const Even = type({ n: "number % 2" })

console.log(
	JSON.stringify([
		Even({ n: 2, m: 1 }),
		String(Even({ n: 3 })),
		Even.description
	])
)
