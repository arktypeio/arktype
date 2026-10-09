import { type } from "arktype"
// a binding of the function Name holds, through which the perturbation test renames it
import { isLong, Name } from "./names.ts"

export const User = type({ name: Name })
