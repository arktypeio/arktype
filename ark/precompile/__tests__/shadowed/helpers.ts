import type { type } from "arktype"
import { Person } from "./types.ts"

// a static helper, whose site arktype composes from `Person` as the helper reads it
export const toPerson = (t: type.Any) => t.to(Person)
