import { FormApi } from "@tanstack/form-core"
import { Account, Signup } from "./schemas.ts"

// its values are its defaults' type, which isn't the Type's
export const accountForm = new FormApi({
	defaultValues: { id: "", email: "" },
	validators: { onChange: Account }
})

export const signupForm = new FormApi({
	defaultValues: { email: "", age: "" } as typeof Signup.inferIn,
	validators: { onSubmit: Signup }
})
