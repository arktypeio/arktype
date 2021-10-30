import { compile, parse } from "retypes"

export const user = compile({
    user: { name: "string", age: "number", friends: "user[]" }
}).types.user

export type User = typeof user.type
