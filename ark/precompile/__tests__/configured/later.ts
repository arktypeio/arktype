import { makeUser, Strings } from "./schemas.ts"
import "./config.ts"

console.log(
	JSON.stringify([
		makeUser()({ name: 1, email: "ada" }),
		Strings.email("ada"),
		Strings.email.description
	])
)
