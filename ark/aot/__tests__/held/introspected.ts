import { type } from "arktype"
import { isTruthy } from "./predicates.ts"

// a site reading the json checks the dropped narrow is a function too
export const json = type([
	{ "[string]": "number < 0" },
	"&",
	{ "[string]": ["string", ":", isTruthy] }
]).or(type("'a'")).json
