import { type } from "arktype"
import { Login } from "../arktype.ts"

// each validator as a request handler uses it: called on the body, its issues returned

export const checkLogin = (body: unknown) => {
	const out = Login(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}
