import { type } from "arktype"
import { Box } from "./generic.ts"

export const Boxed = Box("string")
export const Parsed = type(["string.numeric.parse", "[]"])
