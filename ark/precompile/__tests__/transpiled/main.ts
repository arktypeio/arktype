import "./config.ts"
import { type } from "arktype"

const isLong = (s: string) => s.length > 1

export const Even = type({ n: "number % 2" })

export const Long = type("string").narrow(isLong)

console.log(
	JSON.stringify([
		Even({ n: 2, m: 1 }),
		String(Even({ n: 3 })),
		Even.description,
		Long("ab"),
		String(Long("a"))
	])
)
