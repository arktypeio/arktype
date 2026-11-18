import { makeUser } from "./schemas.ts"

console.log(JSON.stringify(makeUser()({ name: 1, email: "ada" })))
