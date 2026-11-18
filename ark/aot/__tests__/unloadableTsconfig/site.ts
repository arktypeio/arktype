import { type } from "arktype"
import { kinds } from "./kinds.ts"

export const Kind = type.enumerated(...kinds)
