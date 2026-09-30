import { attest, contextualize } from "@ark/attest"
import { hasArkKind } from "@ark/schema"
import { ark, type } from "arktype"
import { arkFormData } from "arktype/internal/keywords/FormData.ts"

// the roots of each keyword module's own export that are not compiled, by
// flat name. An export of each module's whole scope leaves them interpreted
const interpretedByModule = (): string[] => {
	const interpreted: string[] = []
	const walk = (prefix: string, module: Record<string, unknown>) => {
		for (const k in module) {
			const resolution = module[k]
			if (hasArkKind(resolution, "module"))
				walk(`${prefix}.${k}`, resolution as never)
			else if (
				hasArkKind(resolution, "root") &&
				resolution.precompilation === undefined
			)
				interpreted.push(`${prefix}.${k}`)
		}
	}
	const aliases = ark.internal.aliases as Record<string, unknown>
	for (const k in aliases)
		if (hasArkKind(aliases[k], "module")) walk(k, aliases[k] as never)
	return interpreted.sort()
}

contextualize(() => {
	it("keyword modules leave the roots a whole-scope export does interpreted", () => {
		attest(interpretedByModule()).equals([
			"Array.readonly",
			"Array.root",
			"FormData.value",
			"object.json.root",
			"string.date.epoch.root",
			"string.date.iso.root",
			"string.integer.root",
			"string.normalize.root",
			"string.numeric.root",
			"unknown.root"
		])
	})

	it("FormData.value describes its union as the interpreter does", () => {
		// Node18 doesn't have a File constructor
		if (process.version.startsWith("v18")) return

		const expected = "must be a string or a File instance (was 0)"
		attest(arkFormData.value(0).toString()).equals(expected)
		attest(type.keywords.FormData.value(0).toString()).equals(expected)
	})
})
