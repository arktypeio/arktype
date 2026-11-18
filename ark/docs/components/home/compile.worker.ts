/**
 * The homepage's precompile figure, live: the same precompileStandalone
 * @ark/aot calls in a build, run on a declaration the reader edits. Nothing
 * loads it until they do.
 */
import { type } from "arktype"
import {
	precompileStandalone,
	type StandaloneExport,
	type StandaloneOptions
} from "arktype/internal/standalone.ts"
import type {
	CompileRequest,
	CompileResponse,
	CompileResult
} from "./compileState.ts"

const scope = self as unknown as {
	onmessage: (e: MessageEvent<CompileRequest>) => void
	postMessage: (response: CompileResponse) => void
}

/** `const Name = <expression>`, the one statement the figure's file holds */
const declaration =
	/^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+?);?\s*$/

/** a check as the default build writes it: whether data is allowed, and nothing else */
const check = /^const \w+Allows = function \(data, ctx\) \{[\s\S]*?\n \}$/gm

/** as the playground's Precompiled tab asks for a module no bundler scanned */
const optionsOf = (name: string): StandaloneOptions => ({
	members: {},
	freeze: true,
	lazy: true,
	checks: "types",
	optimize: "speed",
	called: true,
	readsAllows: true,
	piped: true,
	hoisted: false,
	values: true,
	readOnLoad: [name]
})

/**
 * A check, laid out to be read: the writer's annotations for bundlers go,
 * and its body starts on its own line. No token of it changes.
 */
const reflow = (written: string) =>
	written
		.replaceAll(/\/\* @__(?:NOINLINE|PURE)__ \*\/ /g, "")
		.replace(/\{ {5}/, "{\n    ")
		.replace(/\n \}$/, "\n}")
		.replaceAll(/^( {4})+/gm, indent => "\t".repeat(indent.length / 4))

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e))

const compile = (source: string): CompileResult => {
	const match = declaration.exec(source)
	if (!match)
		return {
			ok: false,
			message: "This file is one declaration: const Shape = type(…)"
		}
	const [, name, expression] = match
	let exported: unknown
	try {
		// the reader's own text, in a worker, with nothing in scope but `type`
		exported = new Function("type", `"use strict"; return (${expression})`)(
			type
		)
	} catch (e) {
		return { ok: false, message: messageOf(e) }
	}
	if (typeof exported !== "function" || !("expression" in exported))
		return { ok: false, message: `${name} isn't a Type` }
	try {
		const { code } = precompileStandalone(
			{ [name]: exported as StandaloneExport },
			optionsOf(name)
		)
		const checks = code.match(check) ?? []
		if (!checks.length)
			return { ok: false, message: `${name} was written without a check` }
		return {
			ok: true,
			// written leaves first: the Type's own check, the last, leads here
			code: checks.reverse().map(reflow).join("\n\n"),
			checks: checks.length
		}
	} catch (e) {
		return { ok: false, message: messageOf(e) }
	}
}

scope.onmessage = ({ data }) =>
	scope.postMessage({ id: data.id, result: compile(data.source) })

scope.postMessage({ ready: true })
