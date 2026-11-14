import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
import { createRequire } from "node:module"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

// the language service editors on TypeScript 5 and 6 complete with
const ts: typeof import("typescript") = createRequire(
	new URL("../../attest/package.json", import.meta.url)
)("typescript-6")

const completedFile = fileURLToPath(new URL("./completed.ts", import.meta.url))
let completedText = ""
let completedVersion = 0

const service = ts.createLanguageService({
	getScriptFileNames: () => [completedFile],
	getScriptVersion: name =>
		name === completedFile ? `${completedVersion}` : "0",
	getScriptSnapshot: name => {
		const contents =
			name === completedFile ? completedText : ts.sys.readFile(name)
		return contents === undefined ? undefined : (
				ts.ScriptSnapshot.fromString(contents)
			)
	},
	getCurrentDirectory: () => dirname(completedFile),
	getCompilationSettings: () => ({
		strict: true,
		module: ts.ModuleKind.NodeNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		customConditions: ["ark-ts"],
		allowImportingTsExtensions: true,
		skipLibCheck: true,
		noEmit: true,
		types: []
	}),
	getDefaultLibFileName: ts.getDefaultLibFilePath,
	fileExists: name => name === completedFile || ts.sys.fileExists(name),
	readFile: ts.sys.readFile,
	readDirectory: ts.sys.readDirectory,
	directoryExists: ts.sys.directoryExists,
	getDirectories: ts.sys.getDirectories,
	realpath: ts.sys.realpath!
})

/**
 * What completing the last string of a call costs an editor: the completions
 * offered, and the types TypeScript instantiated to find them in a checker
 * that has checked nothing else, which is the one an editor has after an edit.
 */
const complete = (call: string) => {
	completedText = `import { type } from "arktype"\n${call}\n`
	completedVersion++
	const completions = service.getCompletionsAtPosition(
		completedFile,
		completedText.lastIndexOf('"'),
		{}
	)
	return {
		entries: completions?.entries.map(entry => entry.name) ?? [],
		instantiations: service.getProgram()!.getInstantiationCount()
	}
}

/** What an editor shows on hovering the last `name` in `statements`. */
const hover = (statements: string, name: string): string => {
	completedText = `import { type } from "arktype"\n${statements}\n`
	completedVersion++
	return ts.displayPartsToString(
		service.getQuickInfoAtPosition(
			completedFile,
			completedText.lastIndexOf(name)
		)?.displayParts
	)
}

contextualize(() => {
	it("completes standalone keyword", () => {
		// @ts-expect-error
		attest(() => type("s")).completions({ s: ["string", "symbol"] })
	})

	it("completes within objects", () => {
		// @ts-expect-error
		attest(() => type({ b: "b" })).completions({
			b: ["bigint", "boolean"]
		})
	})

	it("completes within expressions", () => {
		// @ts-expect-error
		attest(() => type("string|n")).completions({
			"string|n": ["string|never", "string|null", "string|number"]
		})
	})

	it("completes within expressions in objects", () => {
		// @ts-expect-error
		attest(() => type({ key: "number | b" })).completions({
			"number | b": ["number | bigint", "number | boolean"]
		})
	})

	it("completes user-defined aliases", () => {
		const $ = scope({
			over9000: "number>9000",
			myArk: {
				kind: "'type'",
				buoyancy: "null",
				dxLevel: "over9000"
			},
			noahsArk: {
				kind: "'boat'",
				buoyancy: "over9000",
				dxLevel: "null"
			}
		})
		// this could also have been defined with completions directly in scope!
		attest(() =>
			$.type({
				// @ts-expect-error
				type: "my",
				// @ts-expect-error
				boat: "noah"
			})
		).completions({ my: ["myArk"], noah: ["noahsArk"] })
	})

	// To complete a string argument, TypeScript first resolves the call with
	// inference blocked from that string, by inferring from the parameter's type
	// to itself. An alias it meets there with a type parameter among its
	// arguments has its variance measured, and behind each of validateDefinition,
	// validateParameterString, parseValidGenericParams and type.infer that
	// compares the whole string parser: 630,000 to 1,050,000 instantiations on
	// every keystroke, 650ms of them on TypeScript 6, which nothing that only
	// checks a call ever pays. Each parameter here reaches those through an
	// interface whose variance is annotated, and takes about 15,000, nearly all
	// of them spent reading arktype's own source.
	// ArkError is a lookup by code because TypeScript prints an alias for a
	// distributive conditional as what it resolves to, here 765 characters of
	// every error there is
	it("shows an issue as an ArkError", () => {
		attest(
			hover(
				`const out = type("string")(0)
if (out instanceof type.errors) for (const issue of out.issues) issue`,
				"issue"
			)
		).snap("const issue: ArkError<ArkErrorCode>")
	})

	describe("cost", () => {
		it("a definition", () => {
			const completed = complete(`type("s")`)
			attest(completed.entries).satisfies("string[] >= 2")
			attest(completed.instantiations).satisfies("number < 50000")
		})

		it("the first of several arguments", () => {
			const completed = complete(`type("s", "[]")`)
			attest(completed.entries).satisfies("string[] >= 2")
			attest(completed.instantiations).satisfies("number < 50000")
		})

		it("the body of a generic", () => {
			const completed = complete(`type("<t>", "s")`)
			attest(completed.entries).satisfies("string[] >= 2")
			attest(completed.instantiations).satisfies("number < 50000")
		})

		it("an operand after an operator", () => {
			const completed = complete(`type("string", "|", "s")`)
			attest(completed.entries).snap(["string", "symbol"])
			attest(completed.instantiations).satisfies("number < 50000")
		})
	})
})
