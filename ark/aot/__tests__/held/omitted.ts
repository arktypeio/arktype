import { Listed } from "./lists.ts"

// arktype found the default a thunk as it created Listed, which omitting a key keeps
export const Omitted = Listed.omit("a")
