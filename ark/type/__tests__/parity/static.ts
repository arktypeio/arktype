import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

// what TypeScript says of each probe: the errors in its call, and the types
// at the positions it names

const requireTypeScript = createRequire(import.meta.url)

type Compiler = {
	API: new (options: { cwd: string }) => any
	createFileSystemLayer: (files: readonly (readonly [string, string])[]) => any
	TypeFormatFlags: { NoTruncation: number }
}

const loadCompiler = (): Compiler => ({
	...requireTypeScript("typescript/sync"),
	...requireTypeScript("typescript/fs")
})

export const repoRoot = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"..",
	".."
)

export type ProbeFile = {
	path: string
	text: string
	/** ranges whose errors are collected, by id */
	ranges: Record<string, readonly [start: number, end: number]>
	/** positions whose types are printed, by id */
	positions: Record<string, number>
	/** everything written for each id, where an error can leave the checker unreliable */
	blocks: Record<string, readonly [start: number, end: number]>
}

export type StaticResult = {
	errors: Record<string, string[]>
	types: Record<string, string>
	/** ids whose code hit a limit TypeScript caches past, losing later errors */
	unreliable: Set<string>
}

// once TypeScript gives up on an instantiation, it can reuse what it cached for
// it wherever it's met again, even in another file, and report nothing there
const limitHit =
	/excessively deep|infinitely circular|circularly references itself/

type Diagnostic = {
	pos: number
	end: number
	text: string
	messageChain?: readonly Diagnostic[]
}

const flatten = (d: Diagnostic): string =>
	`${d.text}${d.messageChain ? "\n" + d.messageChain.map(flatten).join("\n") : ""}`

export const checkStatic = (files: ProbeFile[]): StaticResult => {
	const compiler = loadCompiler()
	const api = new compiler.API({ cwd: repoRoot })
	const configPath = join(repoRoot, ".parity.tsconfig.json")
	const config = JSON.stringify({
		extends: join(repoRoot, "tsconfig.json"),
		compilerOptions: { noErrorTruncation: true },
		files: files.map(f => f.path),
		include: []
	})
	const snapshot = api.createSnapshot({
		openProjects: [configPath],
		fileSystem: compiler.createFileSystemLayer([
			[configPath, config],
			...files.map(f => [f.path, f.text] as const)
		])
	})
	const project = snapshot.getConfiguredProject(configPath)
	const result: StaticResult = { errors: {}, types: {}, unreliable: new Set() }
	for (const file of files) {
		const diagnostics: Diagnostic[] = project.program.getSemanticDiagnostics(
			file.path
		)
		const syntactic: Diagnostic[] =
			project.program.getSyntacticDiagnostics?.(file.path) ?? []
		for (const d of [...syntactic, ...diagnostics]) {
			if (limitHit.test(flatten(d))) {
				for (const [id, [start, end]] of Object.entries(file.blocks))
					if (d.pos >= start && d.end <= end) result.unreliable.add(id)
			}
			let found = false
			for (const [id, [start, end]] of Object.entries(file.ranges)) {
				if (d.pos >= start && d.end <= end) {
					;(result.errors[id] ??= []).push(flatten(d))
					found = true
					break
				}
			}
			if (!found) {
				;(result.errors["<file>"] ??= []).push(
					`${flatten(d)} @${d.pos}-${d.end}: ${file.text.slice(Math.max(0, d.pos - 300), d.pos + 300)}`
				)
			}
		}
		const ids = Object.keys(file.positions)
		const types = project.checker.getTypeAtPosition(
			file.path,
			ids.map(id => file.positions[id])
		)
		for (let i = 0; i < ids.length; i++) {
			const t = types[i]
			result.types[ids[i]] =
				t === undefined ? "<none>" : (
					project.checker.typeToString(
						t,
						undefined,
						compiler.TypeFormatFlags.NoTruncation
					)
				)
		}
	}
	snapshot.dispose?.()
	api.close?.()
	return result
}

const zws = "​"

/**
 * The messages a type error names, as the string literal types ending in a
 * zero-width space it prints, and whether each is a completion
 */
export const messagesIn = (error: string): string[] => {
	const found: string[] = []
	const literal = /"((?:[^"\\]|\\.)*)"/g
	for (const match of error.matchAll(literal)) {
		let value: string
		try {
			value = JSON.parse(`"${match[1]}"`)
		} catch {
			value = match[1]
		}
		if (value.endsWith(zws + zws))
			found.push(`<completion> ${value.slice(0, -2)}`)
		else if (value.endsWith(zws)) found.push(value.slice(0, -1))
	}
	if (found.length === 0) {
		// a completion is the text it completes to, unmarked
		const completion =
			/parameter of type '((?:"(?:[^"\\]|\\.)*"(?: \| )?)+)'/.exec(error)
		if (completion) found.push(`<completion> ${completion[1]}`)
	}
	return [...new Set(found)]
}
