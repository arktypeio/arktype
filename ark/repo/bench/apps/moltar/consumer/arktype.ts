import { type } from "arktype"
import { Moltar } from "../arktype.ts"

// each validator as a request handler uses it: called on the body, its issues returned

export const checkMoltar = (body: unknown) => {
	const out = Moltar(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}
