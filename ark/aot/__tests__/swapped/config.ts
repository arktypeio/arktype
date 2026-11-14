import { undefinedOptional } from "./containers.ts"

// a mock can swap it for a Scope configured otherwise, which parses the definition otherwise
export const Optional = undefinedOptional.type({ "b?": "s" })
