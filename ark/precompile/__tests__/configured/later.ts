import { makeUser } from "./schemas.ts"
import "./config.ts"

console.log(JSON.stringify(makeUser()({ name: 1, email: "ada" })))
