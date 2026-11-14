import { attest, contextualize } from "@ark/attest"
import { fromHere, readJson } from "@ark/fs"

type Target = string | { default: string }

// the declaration a subpath's typesVersions entry resolves to, if any
const typesVersionsTarget = (
	typesVersions: Record<string, string[]>,
	subpath: string
) => {
	for (const [pattern, [target]] of Object.entries(typesVersions)) {
		const [prefix, suffix = ""] = pattern.split("*")
		if (pattern === subpath) return target
		if (
			pattern.includes("*") &&
			subpath.startsWith(prefix) &&
			subpath.endsWith(suffix)
		)
			return target.replace("*", subpath.slice(prefix.length))
	}
}

// node10 resolution reads typesVersions instead of exports, so each public
// subpath needs an entry pointing at its declarations
const mismatchedSubpaths = (pkg: string) => {
	const { exports, typesVersions } = readJson(
		fromHere("..", "..", pkg, "package.json")
	) as {
		exports: Record<string, Target>
		typesVersions?: Record<string, Record<string, string[]>>
	}
	const mismatched: Record<string, string | undefined> = {}
	for (const [key, target] of Object.entries(exports)) {
		const subpath = key.slice(2)
		if (!subpath || subpath.includes("*") || subpath.startsWith("internal/"))
			continue
		const js = typeof target === "string" ? target : target.default
		if (!js.endsWith(".js")) continue
		const actual = typesVersionsTarget(typesVersions?.["*"] ?? {}, subpath)
		if (actual !== js.replace(/\.js$/, ".d.ts")) mismatched[subpath] = actual
	}
	return mismatched
}

contextualize(() => {
	it("every public subpath has a typesVersions entry", () => {
		attest(mismatchedSubpaths("type")).equals({})
		attest(mismatchedSubpaths("schema")).equals({})
		attest(mismatchedSubpaths("aot")).equals({})
		attest(mismatchedSubpaths("util")).equals({})
		attest(mismatchedSubpaths("regex")).equals({})
		attest(mismatchedSubpaths("sets")).equals({})
	})
})
