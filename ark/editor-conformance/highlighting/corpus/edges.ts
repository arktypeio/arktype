// @ts-nocheck
// Edges of the TextMate grammar's line-oriented, regex-driven matching.
import { type } from "arktype"

// an escaped quote ends the definition early
const escaped = type("string\"number")

// a definition string that spans lines (template literal)
const multiline = type(`string
| number`)

// arguments spanning several lines
const spanning = type(
	"string",
	"number"
)

// a definition directly after another on the same line
const two = [type("string"), type("number")]

// a JSX-free generic arrow inside the arguments
const arrow = type({ f: <T,>(x: T) => "string" })

// a definition inside a template literal substitution, last since TextMate
// reopens the template after it and never closes it
const nested = `${type("string | number")}`
