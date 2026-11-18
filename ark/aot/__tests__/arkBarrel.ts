// a project reaching arktype through a module of its own, as many re-export
// `type` beside their helpers, which an analysis recognizing arktype by its
// import must follow: ARK_FUZZ_ARK_BARREL=named|star|starAs|renamed has each
// fuzzer's app import arktype's values through `arkApi.ts`. Each import keeps
// its line, as a program's sites are named by theirs.
import { dirname, relative } from "node:path"

export type ArkBarrel = "named" | "star" | "starAs" | "renamed"

const styles: ArkBarrel[] = ["named", "star", "starAs", "renamed"]

export const arkBarrel = ((): ArkBarrel | undefined => {
	const style = process.env.ARK_FUZZ_ARK_BARREL
	if (style === undefined || style === "") return
	if (!styles.includes(style as ArkBarrel)) {
		throw new Error(
			`ARK_FUZZ_ARK_BARREL must be one of ${styles.join(", ")} (was ${style})`
		)
	}
	return style as ArkBarrel
})()

export const barrelFile = "arkApi.ts"

const importPattern = /import\s*{([^}]*)}\s*from\s*["']arktype["']/g

// `type Infer` is erased, where `type` and `type as t` are values
const isTypeOnly = (specifier: string) => /^type\s+(?!as\b)\S/.test(specifier)

const nameAndLocal = (specifier: string): [name: string, local: string] => {
	const [name, local = name] = specifier.split(/\s+as\s+/)
	return [name, local]
}

export const throughArkBarrel = (
	files: Record<string, string>,
	style: ArkBarrel | undefined = arkBarrel
): Record<string, string> => {
	if (!style) return files
	const names = new Set<string>()
	const result: Record<string, string> = {}
	for (const [path, text] of Object.entries(files)) {
		// a dependency imports arktype itself, and a .js file can't name a .ts one
		// tsc would rewrite
		if (path.startsWith("node_modules/") || !/\.[cm]?tsx?$/.test(path)) {
			result[path] = text
			continue
		}
		const fromHere = relative(dirname(path), barrelFile)
		const barrel = fromHere.startsWith(".") ? fromHere : `./${fromHere}`
		result[path] = text.replace(importPattern, (match, list: string) => {
			const specifiers = list
				.split(",")
				.map(s => s.trim())
				.filter(Boolean)
			const values = specifiers.filter(s => !isTypeOnly(s))
			if (!values.length) return match
			const types = specifiers.filter(isTypeOnly)
			const pairs = values.map(nameAndLocal)
			for (const [name] of pairs) names.add(name)
			const typeImport =
				types.length ? `import { ${types.join(", ")} } from "arktype"; ` : ""
			const valueImport =
				style === "starAs" ?
					`import { ark } from "${barrel}"; const { ${pairs
						.map(([name, local]) =>
							name === local ? name : `${name}: ${local}`
						)
						.join(", ")} } = ark`
				: style === "renamed" ?
					`import { ${pairs
						.map(([name, local]) => `ark_${name} as ${local}`)
						.join(", ")} } from "${barrel}"`
				:	`import { ${values.join(", ")} } from "${barrel}"`
			const lines = match.split("\n").length - 1
			return `${typeImport}${valueImport}${"\n".repeat(lines)}`
		})
	}
	if (!names.size) return result
	result[barrelFile] =
		style === "star" ? `export * from "arktype"\n`
		: style === "starAs" ? `export * as ark from "arktype"\n`
		: style === "renamed" ?
			`export { ${[...names].map(name => `${name} as ark_${name}`).join(", ")} } from "arktype"\n`
		:	`export { ${[...names].join(", ")} } from "arktype"\n`
	return result
}
