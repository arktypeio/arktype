import { stringIds } from "./containers.ts"

// a mock can swap it for a Module with equal Types from a Scope where `id` is another Type
export const WithId = stringIds.user.and({ id: "id" })
