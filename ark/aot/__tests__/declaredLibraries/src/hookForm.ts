import { arktypeResolver } from "@hookform/resolvers/arktype"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import type { UseFormProps } from "react-hook-form"
import { Account, Signup } from "./schemas.ts"

export const accountResolver = arktypeResolver(Account)

export const signupResolver = standardSchemaResolver(Signup)

export const signupForm = {
	mode: "onBlur",
	resolver: signupResolver
} satisfies UseFormProps<typeof Signup.inferIn, unknown, typeof Signup.infer>
