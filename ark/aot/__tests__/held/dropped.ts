import { type } from "arktype"
import { isTruthy } from "./predicates.ts"

// arktype checks the narrow is a function as it parses it, though the intersection then drops it
export const Dropped = type([
	{ "[string]": "number < 0" },
	"&",
	{ "[string]": ["string", ":", isTruthy] }
]).or(type("'a'"))
