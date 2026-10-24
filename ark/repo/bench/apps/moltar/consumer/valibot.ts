import * as v from "valibot"
import { Moltar } from "../valibot.ts"

// each schema as a request handler uses it: parsed from the body, its issues returned

export const checkMoltar = (body: unknown) => {
	const out = v.safeParse(Moltar, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}
