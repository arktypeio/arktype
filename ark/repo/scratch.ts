import { ark, type } from "arktype"

const unfalse = ark.Exclude("boolean", "false")

const t = type("string")
