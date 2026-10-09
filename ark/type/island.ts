import { allowIslands } from "./entry.ts"

// a standalone build imports this before arktype in each module with a runtime island
allowIslands()
