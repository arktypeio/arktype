/**
 * What the precompiler writes for one declaration, laid out to be read. The
 * homepage's precompile figure calls this twice: at build, for the Shape it
 * opens on, and in a worker, for whatever the reader types. One function
 * for both is what makes the two agree: pressing "edit it live" without
 * changing a character shows the code that was already there.
 *
 * It is the same precompileStandalone @ark/aot calls in a build. Of what
 * that returns, the figure shows the checks: whether data is allowed, and
 * nothing else. The error path (each check's `Apply` twin) and the wiring
 * that hands the pair to the runtime aren't shown, and the figure says so.
 */
import { type } from "arktype"
import {
	precompileStandalone,
	type StandaloneExport,
	type StandaloneOptions
} from "arktype/internal/standalone.ts"
import type { CompileResult } from "./compileState.ts"

/** `const Name = <expression>`, the one statement the figure's file holds */
const declaration =
	/^\s*(?:export\s+)?const\s+([$A-Z_a-z][\w$]*)\s*=\s*([\S\s]+?);?\s*$/

/** a second statement after the first: the file holds one */
const another = /^\s*(?:export\s+)?(?:const|let|var|function|import)\b/m

const oneDeclaration = "This file is one declaration: const Shape = type(…)"

/** a check as the default build writes it */
const check = /^const (\w+)Allows = function \(data, ctx\) {[\S\s]*?\n }$/gm

/** a check written once for several nodes that differ only in their constants */
const template =
	/^const (template\w+) = \(\(([^)]*)\) => {\n([\S\s]*?)\nreturn \[templateAllows, templateApply]\n}\)$/gm

/** one node's copy of a template, with the constants it is called with */
const instance =
	/^const (\w+) = (?:\/\* @__\w+__ \*\/ )*(template\w+)\((.*)\)$/gm

/** the group the validator is created with: its check is the Type's own */
const root = /createValidatorWith\(\s*\w+,\s*(\w+),/

const called = /\b(\w+)Allows\b/g

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

const closers: Record<string, string> = { "(": ")", "[": "]", "{": "}" }

/** where the string, template or regex literal opening at `from` ends */
const literalEnd = (text: string, from: number) => {
	const quote = text[from]
	let inClass = false
	for (let i = from + 1; i < text.length; i++) {
		const char = text[i]
		if (char === "\\") i++
		else if (quote === "/" && char === "[") inClass = true
		else if (quote === "/" && char === "]") inClass = false
		else if (char === quote && !inClass) return i
	}
	return text.length
}

/** a call's arguments, split at its own commas and no literal's */
const argumentsOf = (text: string) => {
	const args: string[] = []
	const open: string[] = []
	let from = 0
	for (let i = 0; i < text.length; i++) {
		const char = text[i]
		const startsValue = text.slice(from, i).trim() === ""
		if (char === '"' || char === "'" || char === "`") i = literalEnd(text, i)
		else if (char === "/" && startsValue) i = literalEnd(text, i)
		else if (char in closers) open.push(closers[char])
		else if (char === open.at(-1)) open.pop()
		else if (char === "," && !open.length) {
			args.push(text.slice(from, i).trim())
			from = i + 1
		}
	}
	args.push(text.slice(from).trim())
	return args
}

/**
 * Every check in a written module, by the name it is called by. A templated
 * check is written once and called through each node's copy, so it is given
 * here once per copy, under that copy's name, with the copy's constants
 * where the template's parameters were: what the copy runs.
 */
const checksOf = (code: string) => {
	const checks = new Map<string, string>()
	const templates = new Map<string, { params: string[]; body: string }>()
	const untemplated = code.replaceAll(template, (_, name, params, body) => {
		templates.set(name, {
			params: params.split(",").map((param: string) => param.trim()),
			body
		})
		return ""
	})
	for (const [, name, from, passed] of untemplated.matchAll(instance)) {
		const written = templates.get(from)
		const [own] = written?.body.match(check) ?? []
		if (!written || !own) continue
		const args = argumentsOf(passed)
		const filled =
			args.length === written.params.length ?
				written.params.reduce(
					(text, param, i) =>
						text.replaceAll(new RegExp(`\\b${param}\\b`, "g"), () => args[i]),
					own
				)
			:	own
		checks.set(name, filled.replace("templateAllows", `${name}Allows`))
	}
	for (const [written, name] of untemplated.matchAll(check))
		checks.set(name, written)
	return checks
}

/**
 * A check, laid out to be read: the writer's annotations for bundlers go,
 * and its body starts on its own line. No other token of it changes.
 */
const reflow = (written: string) =>
	written
		.replaceAll(/\/\* @__(?:NOINLINE|PURE)__ \*\/ /g, "")
		.replace(/{ {5}/, "{\n    ")
		.replace(/\n }$/, "\n}")
		.replaceAll(/^( {4})+/gm, indent => "\t".repeat(indent.length / 4))

/**
 * The checks in the order a reader meets them: the Type's own, then the ones
 * it calls, then the ones those call. The writer's names are a node's kind and hash
 * (`union1b87ppq1fxyhzkAllows`); here each is `check` and its place in that
 * order, and the figure's header says the names were shortened.
 */
const inReadingOrder = (checks: Map<string, string>, own: string) => {
	const order = [own]
	// breadth first: the checks the Type's own calls are numbered before theirs
	for (let i = 0; i < order.length || order.length < checks.size; i++) {
		// written but not reached from the Type's own check: still written
		if (i === order.length)
			order.push([...checks.keys()].find(name => !order.includes(name))!)
		for (const [, callee] of checks.get(order[i])!.matchAll(called))
			if (checks.has(callee) && !order.includes(callee)) order.push(callee)
	}
	return order.map(name =>
		reflow(checks.get(name)!).replaceAll(called, (written, callee) =>
			order.includes(callee) ? `check${order.indexOf(callee) + 1}` : written
		)
	)
}

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e))

export const emit = (source: string): CompileResult => {
	const match = declaration.exec(source)
	if (!match) return { ok: false, message: oneDeclaration }
	const [, name, expression] = match
	let exported: unknown
	try {
		// the text as typed, with nothing in scope but `type`
		exported = new Function("type", `"use strict"; return (${expression})`)(
			type
		)
	} catch (e) {
		// a second statement fails to parse as the first one's value
		if (e instanceof SyntaxError && another.test(expression))
			return { ok: false, message: oneDeclaration }
		return { ok: false, message: messageOf(e) }
	}
	if (typeof exported !== "function" || !("expression" in exported))
		return { ok: false, message: `${name} isn't a Type` }
	try {
		const { code } = precompileStandalone(
			{ [name]: exported as StandaloneExport },
			optionsOf(name)
		)
		const checks = checksOf(code)
		// written leaves first, so the Type's own is the last if the wiring doesn't say
		const own = root.exec(code)?.[1] ?? [...checks.keys()].at(-1)
		if (own === undefined || !checks.has(own))
			return { ok: false, message: `${name} was written without a check` }
		const [main, ...helpers] = inReadingOrder(checks, own)
		return { ok: true, main, helpers }
	} catch (e) {
		return { ok: false, message: messageOf(e) }
	}
}
