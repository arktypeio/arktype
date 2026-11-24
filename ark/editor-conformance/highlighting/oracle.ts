// Regenerates expected/*.json, the TextMate oracle every editor target is
// checked against: VS Code's tokenizer (vscode-textmate + oniguruma) running
// the extension's own injection grammar over each corpus file.
//
//   node ark/editor-conformance/highlighting/oracle.ts           write
//   node ark/editor-conformance/highlighting/oracle.ts --check   fail if stale
import { createHash } from "node:crypto"
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { formatFor } from "../format.ts"
import { categorize, isStringOrCommentText } from "./categories.ts"
import { toSpans, type CharCategory, type HighlightFixture } from "./spans.ts"
import { createTokenizer, hosts, type ScopedToken } from "./textmate.ts"

const here = new URL("./", import.meta.url)
const corpusDir = new URL("corpus/", here)
const expectedDir = new URL("expected/", here)

export const fixtureNames = (): string[] =>
	readdirSync(corpusDir)
		.filter(name => name.split(".").pop()! in hosts)
		.sort()

/** Every file expected/ should hold, by name, as the oracle produces it now. */
export const oracleOutputs = async (): Promise<Map<string, string>> => {
	const scratch = new URL("../../extension/arktype.scratch.ts", import.meta.url)
	if (
		readFileSync(scratch, "utf8") !==
		readFileSync(new URL("scratch.ts", corpusDir), "utf8")
	) {
		throw new Error(
			"corpus/scratch.ts must be a verbatim copy of ark/extension/arktype.scratch.ts"
		)
	}

	const base = await createTokenizer({ ark: false })
	const ark = await createTokenizer({ ark: true })

	const scopesByChar = (tokens: ScopedToken[][], lines: string[]) =>
		lines.map((text, line) => {
			const chars: string[][] = Array.from({ length: text.length }, () => [])
			for (const t of tokens[line])
				for (let c = t.start; c < t.end; c++) chars[c] = t.scopes
			return chars
		})

	const outputs = new Map<string, string>()
	for (const name of fixtureNames()) {
		const source = readFileSync(new URL(name, corpusDir), "utf8")
		const ext = name.split(".").pop()!
		const lines = source.split("\n")
		const withoutArk = scopesByChar(base(source, ext), lines)
		const withArk = scopesByChar(ark(source, ext), lines)
		const chars = lines.map((text, line) =>
			Array.from(
				{ length: text.length },
				(_, column): CharCategory | undefined => {
					const scopes = withArk[line][column]
					const category = categorize(scopes)
					const baseCategory = categorize(withoutArk[line][column])
					if (isStringOrCommentText(withoutArk[line][column]))
						return { category, region: "text", baseCategory, scopes }
					return baseCategory === category ? undefined : (
							{ category, region: "code", baseCategory, scopes }
						)
				}
			)
		)
		const fixture: HighlightFixture = {
			source: `corpus/${name}`,
			spans: toSpans(lines, chars)
		}
		outputs.set(
			`${name}.json`,
			await formatFor(
				new URL(`${name}.json`, expectedDir),
				JSON.stringify(fixture)
			)
		)
	}

	const hash = (value: unknown) =>
		createHash("sha256")
			.update(JSON.stringify(value))
			.digest("hex")
			.slice(0, 16)

	const langsVersion = JSON.parse(
		readFileSync(new URL("../package.json", import.meta.url), "utf8")
	).devDependencies["@shikijs/langs"]

	const hostGrammars: Record<string, { scopeName: string; sha256: string }> = {}
	for (const [ext, host] of Object.entries(hosts)) {
		const grammars = (await import(`@shikijs/langs/${host.bundle}`)).default
		hostGrammars[ext] = {
			scopeName: host.scopeName,
			sha256: hash(grammars.find((g: any) => g.scopeName === host.scopeName))
		}
	}

	const metadata = {
		$comment:
			"How expected/*.json were produced. Host grammars are @shikijs/langs bundles; sha256 is of the JSON-serialized grammar object, truncated to 16 hex chars.",
		engine: "@shikijs/vscode-textmate + @shikijs/engine-oniguruma",
		grammars: `@shikijs/langs@${langsVersion}`,
		injection: {
			path: "ark/extension/injected.tmLanguage.json",
			sha256: hash(
				JSON.parse(
					readFileSync(
						new URL(
							"../../extension/injected.tmLanguage.json",
							import.meta.url
						),
						"utf8"
					)
				)
			)
		},
		hosts: hostGrammars
	}
	outputs.set(
		"_oracle.json",
		await formatFor(
			new URL("_oracle.json", expectedDir),
			JSON.stringify(metadata)
		)
	)
	return outputs
}

/** Names of the expected/ files that differ from what the oracle produces. */
export const staleOracleFiles = (outputs: Map<string, string>): string[] => {
	const stale = [...outputs]
		.filter(([file, contents]) => {
			try {
				return readFileSync(new URL(file, expectedDir), "utf8") !== contents
			} catch {
				return true
			}
		})
		.map(([file]) => file)
	const extra = readdirSync(expectedDir).filter(f => !outputs.has(f))
	return [...stale, ...extra]
}

if (import.meta.main) {
	const outputs = await oracleOutputs()
	if (process.argv.includes("--check")) {
		const stale = staleOracleFiles(outputs)
		if (stale.length) {
			console.error(
				`expected/ is stale (${stale.join(", ")}); run node ark/editor-conformance/highlighting/oracle.ts`
			)
			process.exit(1)
		}
		console.log(
			`expected/ matches the TextMate oracle (${outputs.size - 1} fixtures)`
		)
	} else {
		rmSync(expectedDir, { recursive: true, force: true })
		mkdirSync(expectedDir)
		for (const [file, contents] of outputs)
			writeFileSync(new URL(file, expectedDir), contents)
		console.log(`wrote ${outputs.size - 1} fixtures to expected/`)
	}
}
