import { type } from "arktype"
import { double } from "./containers.ts"

// arktype checks `double` before it finds it can't write this JSON Schema
type(["'a'", "=>", double]).or(type({})).toJsonSchema()
