import { Defaulting } from "./generics.ts"

// arktype found the default a thunk as it declared Defaulting, before anything read its parameters again
export const Declared = Defaulting({})
