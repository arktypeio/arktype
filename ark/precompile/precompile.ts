import { ParseError, registeredNameOf } from "@ark/util"
import type { Node } from "oxc-parser"
import { DynamicValue } from "./dynamic.ts"
import { contains, ModuleGraph } from "./graph.ts"
import type { PrecompileHost } from "./host.ts"
import {
	createSiteState,
	findDynamic,
	Interpreter,
	isObjectLike,
	type InterpreterOptions,
	type Read,
	type SiteState
} from "./interpreter.ts"
import type { SourceModule } from "./module.ts"
import { findSites, type SiteCandidate } from "./sites.ts"

export interface PrecompileOptions extends InterpreterOptions {}

export interface PrecompileResult {
	sites: Site[]
	diagnostics: Diagnostic[]
	dependencies: string[]
}

export interface Site {
	// the arktype export at the root, or "reference" for a Type, Scope or Generic the program defines, or "helper" for a static helper
	kind: string
	start: number
	end: number
	line: number
	column: number
	status: "accepted" | "rejected"
	reasons: string[]
	// the value arktype computed, which a factory reproduces
	value: unknown
	// the error the definition throws, which a factory throws when it is created
	parseError: ParseError | undefined
	holes: Hole[]
	inputs: Input[]
	helpers: Helper[]
}

export interface Hole {
	file: string
	// the expression evaluated in place at runtime, which is in the site's source unless the hole was read through a binding
	start: number
	end: number
	kind: "function" | "class" | "symbol" | "opaque"
	// the parameter count compiled for, undefined when no declaration gives one
	arity: number | undefined
	// a symbol's description
	description: string | undefined
	isCalledAtDefinition: boolean
	// an opaque value arktype parsed as a Standard Schema
	isDefinition: boolean
}

export interface Input {
	kind: "import" | "local" | "define"
	// for an import, the module that exports it
	file: string | undefined
	name: string
	path: PropertyKey[]
	value: unknown
}

export interface Helper {
	file: string
	name: string
	start: number
	end: number
}

export type Rule = "R1" | "parse"

export interface Diagnostic {
	severity: "error" | "warning"
	rule: Rule
	file: string
	start: number
	end: number
	line: number
	column: number
	message: string
	reasons: string[]
	hint: string
}

export const precompileModule = (
	source: string,
	id: string,
	host: PrecompileHost,
	opts?: PrecompileOptions
): PrecompileResult => new Precompiler(host, opts).precompileModule(source, id)

export class Precompiler {
	graph: ModuleGraph
	interpreter: Interpreter

	constructor(host: PrecompileHost, opts?: PrecompileOptions) {
		this.graph = new ModuleGraph(host)
		this.interpreter = new Interpreter(this.graph, opts)
	}

	precompileModule(source: string, id: string): PrecompileResult {
		const module = this.graph.add(id, source)
		if (module.parseErrors.length) {
			return {
				sites: [],
				diagnostics: module.parseErrors.map(message =>
					this.diagnostic(
						module,
						module.program,
						"R1",
						`${id} cannot be parsed: ${message}`,
						[]
					)
				),
				dependencies: [id]
			}
		}
		const candidates = findSites(module, this.graph, this.interpreter)
		for (const candidate of candidates)
			this.interpreter.sitesByNode.set(candidate.state.node, candidate.state)
		const settled: SiteCandidate[] = []
		const sites: Site[] = []
		const diagnostics: Diagnostic[] = []
		for (const candidate of candidates) {
			if (
				settled.some(
					outer =>
						outer.fn === candidate.fn &&
						contains(outer.state.node, candidate.state.node)
				) ||
				!this.settle(candidate)
			)
				continue
			settled.push(candidate)
			if (isFolded(candidate, settled, this.interpreter)) continue
			const site = this.finalize(candidate, module)
			sites.push(site)
			diagnostics.push(...this.diagnosticsOf(site, candidate, module))
		}
		return {
			sites,
			diagnostics: diagnostics.sort((l, r) => l.start - r.start),
			dependencies: this.graph.dependenciesOf(id)
		}
	}

	// a rejected validation, or a call to a static helper that makes no request of its own, leaves its callee or argument as the site
	private settle(candidate: SiteCandidate): boolean {
		for (;;) {
			const state = this.interpreter.evaluateSite(candidate.state)
			const fallback = candidate.fallbacks.pop()
			const rejection = rejectionOf(state)
			const call = state.node
			if (!fallback || !rejection || call.type !== "CallExpression") return true
			const isShrinkable =
				contains(call.callee, fallback) ?
					rejection.code === "validation" && rejection.node === call
				:	state.requests.every(
						([node, module]) =>
							module === state.module &&
							call.arguments.some(arg => contains(arg, node))
					)
			if (!isShrinkable) return true
			if (fallback === candidate.root) return false
			candidate.state = createSiteState(fallback, state.module)
			this.interpreter.sitesByNode.set(fallback, candidate.state)
		}
	}

	private finalize(candidate: SiteCandidate, module: SourceModule): Site {
		const { state } = candidate
		const [line, column] = module.lineAndColumnOf(state.node.start)
		const site: Site = {
			kind: candidate.kind,
			start: state.node.start,
			end: state.node.end,
			line,
			column,
			status: "accepted",
			reasons: [],
			value: undefined,
			parseError: undefined,
			holes: [],
			inputs: [],
			helpers: state.trace.helpers.map(([node, helperModule]) => ({
				file: helperModule.id,
				name: helperNameOf(node),
				start: node.start,
				end: node.end
			}))
		}
		const dynamic = rejectionOf(state)
		if (dynamic) return reject(site, dynamic)
		if (state.error instanceof ParseError) site.parseError = state.error
		else site.value = state.value
		for (const read of state.trace.reads) {
			const input = this.inputOf(read, candidate, module)
			if (input instanceof DynamicValue) return reject(site, input)
			if (!site.inputs.some(existing => isCoveredBy(input, existing)))
				site.inputs.push(input)
		}
		for (const value of state.holes) {
			if (!isHeld(value, this.interpreter)) continue
			const hole = this.holeOf(value, candidate, module)
			if (hole instanceof DynamicValue) return reject(site, hole)
			site.holes.push(hole)
		}
		site.holes.sort((l, r) => l.start - r.start)
		return site
	}

	private inputOf(
		read: Read,
		candidate: SiteCandidate,
		module: SourceModule
	): Input | DynamicValue {
		const { root, path, value } = read
		if (root.kind === "define")
			return { kind: "define", file: undefined, name: root.name, path, value }
		if (root.kind === "export")
			return { kind: "import", file: root.file, name: root.name, path, value }
		const { binding } = root
		if (
			root.module === module &&
			contains(binding.scope.node, candidate.state.node)
		)
			return { kind: "local", file: undefined, name: binding.name, path, value }
		if (binding.exportNames.length) {
			return {
				kind: "import",
				file: root.module.id,
				name: binding.exportNames[0],
				path,
				value
			}
		}
		return new DynamicValue(
			module,
			candidate.state.node,
			"the site reads an object that escapes a module that does not export it",
			this.interpreter.escapeOf(binding, root.module) ?? undefined
		)
	}

	private holeOf(
		value: unknown,
		candidate: SiteCandidate,
		module: SourceModule
	): Hole | DynamicValue {
		const standIn =
			typeof value === "symbol" ? undefined : (
				this.interpreter.standIns.get(value as object)!
			)
		const sourcesByValue = candidate.state.sourcesByValue
		const source =
			sourcesByValue.get(value) ??
			(standIn?.dynamic && sourcesByValue.get(standIn.dynamic))
		if (!source && standIn?.closure?.env) {
			return new DynamicValue(
				standIn.module,
				standIn.node,
				`the function at ${standIn.module.positionOf(standIn.node)} is created by each call to a static helper, so the precompiled site cannot reach it`
			)
		}
		const [node, origin] =
			source ? [source, module]
			: standIn ? [standIn.node, standIn.module]
			: this.interpreter.symbolSources.get(value as symbol)!
		return {
			file: origin.id,
			start: node.start,
			end: node.end,
			kind: standIn?.kind ?? "symbol",
			arity: standIn?.arity,
			description: standIn ? undefined : (value as symbol).description,
			isCalledAtDefinition: !!standIn?.isCalled,
			isDefinition: !!standIn?.isDefinition
		}
	}

	private diagnosticsOf(
		site: Site,
		candidate: SiteCandidate,
		module: SourceModule
	): Diagnostic[] {
		const node = candidate.state.node
		if (site.status === "rejected") {
			return [
				this.diagnostic(
					module,
					node,
					"R1",
					`${module.snippetOf(node)} cannot be precompiled`,
					site.reasons
				)
			]
		}
		const result: Diagnostic[] = []
		if (site.parseError) {
			result.push(
				this.diagnostic(
					module,
					node,
					"parse",
					`${module.snippetOf(node)} throws a ParseError`,
					[site.parseError.message]
				)
			)
		}
		return result
	}

	private diagnostic(
		module: SourceModule,
		node: Node,
		rule: Rule,
		message: string,
		reasons: string[]
	): Diagnostic {
		const [line, column] = module.lineAndColumnOf(node.start)
		return {
			severity: rule === "parse" ? "warning" : "error",
			rule,
			file: module.id,
			start: node.start,
			end: node.end,
			line,
			column,
			message,
			reasons,
			hint: hintsByRule[rule]
		}
	}
}

export const renderDiagnostic = (diagnostic: Diagnostic): string =>
	[
		`${diagnostic.file}:${diagnostic.line}:${diagnostic.column}  ${diagnostic.message}`,
		...diagnostic.reasons.map(reason => `  ${reason}`),
		`  ${diagnostic.hint}`
	].join("\n")

const hintsByRule: Record<Rule, string> = {
	R1: `Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".`,
	parse: "The precompiled site throws the same ParseError when it is created."
}

const reject = (site: Site, dynamic: DynamicValue): Site => {
	site.status = "rejected"
	site.reasons = chainOf(dynamic)
	site.value = undefined
	site.holes = []
	site.inputs = []
	return site
}

const rejectionOf = (state: SiteState): DynamicValue | undefined =>
	state.error instanceof DynamicValue ? state.error
	: state.error === undefined ? findDynamic(state.value)
	: undefined

const chainOf = (dynamic: DynamicValue): string[] => {
	const result: string[] = []
	for (let link: DynamicValue | undefined = dynamic; link; link = link.cause)
		result.push(link.message)
	return result
}

const isCoveredBy = (input: Input, existing: Input) =>
	input.kind === existing.kind &&
	input.file === existing.file &&
	input.name === existing.name &&
	existing.path.length <= input.path.length &&
	existing.path.every((k, i) => input.path[i] === k)

// a site inside a function written in an enclosing site, which calls it at build, is folded into it
const isFolded = (
	candidate: SiteCandidate,
	candidates: SiteCandidate[],
	interpreter: Interpreter
) =>
	!!candidate.fn &&
	candidates.some(
		outer =>
			outer !== candidate &&
			outer.state.interpreted.has(candidate.fn!) &&
			contains(outer.state.node, candidate.fn!) &&
			!outer.state.holes.some(
				hole =>
					isObjectLike(hole) &&
					interpreter.standIns.get(hole)?.node === candidate.fn &&
					isHeld(hole, interpreter)
			)
	)

// a function arktype only calls while defining a type is not part of the type
const isHeld = (hole: unknown, interpreter: Interpreter) =>
	!isObjectLike(hole) ||
	!interpreter.standIns.get(hole)!.isCalled ||
	registeredNameOf(hole) !== undefined

const helperNameOf = (node: Node): string =>
	node.type === "FunctionDeclaration" ? (node.id?.name ?? "default")
	: node.parent?.type === "VariableDeclarator" ?
		(node.parent.id as { name: string }).name
	:	""
