import "./config.ts"
import { type } from "arktype"

const isLong = (s: string) => s.length > 1

export const Even = type({ n: "number % 2" })

export const Long = type("string").narrow(isLong)

// errors print what a standalone validator keeps of arktype's
const issuesOf = (out: unknown) =>
	out instanceof type.errors ?
		out.issues.map(issue => [issue.code, ...issue.path])
	:	out

console.log(
	JSON.stringify([
		Even({ n: 2, m: 1 }),
		issuesOf(Even({ n: 3 })),
		Even.description,
		Long("ab"),
		issuesOf(Long("a"))
	])
)
