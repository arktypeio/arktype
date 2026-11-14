import Type from "typebox"
import { Compile } from "typebox/compile"

export const Login = Compile(
	Type.Object({
		email: Type.String({ format: "email" }),
		password: Type.String({ minLength: 8, maxLength: 64 })
	})
)
