import { contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"

contextualize(() => {
	const t = rootSchema({})

	const o = t.select("alias")

	const out = t.select({
		kind: "domain",
		where: d => d.domain === "string"
	})

	const out3 = t.select({
		where: n => n.hasKind("domain")
	})

	const out2 = t.select({
		kind: "domain"
	})
})
