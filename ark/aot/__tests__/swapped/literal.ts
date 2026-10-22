import { keepsA } from "./containers.ts"

// a mock can swap it for a Scope whose narrow keeps another unit
export const Kept = keepsA.type("c")
