import { type } from "arktype"
import { shortNames } from "./containers.ts"

// a mock can swap it for a Module holding another function
export const Named = type({ name: shortNames.name })
