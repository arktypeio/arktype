import * as v from "valibot"
import { Login } from "../valibot.ts"

// each schema as a request handler uses it: parsed from the body, its issues returned

export const checkLogin = (body: unknown) => {
	const out = v.safeParse(Login, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}
