import { ParseError, registeredNameOf } from "@ark/util"
import type { CallExpression, Node } from "oxc-parser"
import { DynamicValue } from "./dynamic.ts"
import {
	contains,
	ModuleGraph,
	runtimeExports,
	staticBodyOf,
	unwrapExpression
} from "./graph.ts"
import type { PrecompileHost } from "./host.ts"
import {
	createSiteState,
	findDynamic,
	Interpreter,
	isObjectLike,
	isPlainContainer,
	type InterpreterOptions,
	type Read,
	type SiteState
} from "./interpreter.ts"
import type { SourceModule } from "./module.ts"
import {
	enclosingFunctionOf,
	findSites,
	isFoldedHelper,
	type SiteCandidate
} from "./sites.ts"

export type PrecompileMode = "standalone" | "cache"

export interface PrecompileOptions extends InterpreterOptions {
	// standalone builds ship a runtime instead of arktype, so every arktype expression must be folded
	mode?: PrecompileMode | undefined
	// the module whose `configure()` call sets the configuration
	config?: string | undefined
}

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

export type Rule = "R1" | "R2" | "R3" | "R4" | "parse"

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
	mode: PrecompileMode
	config: string | undefined

	constructor(host: PrecompileHost, opts?: PrecompileOptions) {
		this.graph = new ModuleGraph(host)
		this.interpreter = new Interpreter(this.graph, opts)
		this.mode = opts?.mode ?? "standalone"
		this.config = opts?.config
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
		diagnostics.push(...this.checkConfiguration(module))
		if (this.mode === "standalone")
			diagnostics.push(...this.checkStandalone(module, candidates, sites))
		return {
			sites,
			diagnostics: diagnostics.sort((l, r) => l.start - r.start),
			dependencies: this.graph.dependenciesOf(id)
		}
	}

	private settle(candidate: SiteCandidate): boolean {
		for (;;) {
			const state = this.interpreter.evaluateSite(candidate.state)
			// reading a member of a Type, Scope or Module makes no request, so it is not a site of its own
			if (
				candidate.kind === "reference" &&
				!state.requests.length &&
				isMemberRead(state.node, candidate.root)
			)
				return false
			const rejection = rejectionOf(state)
			const fallback = rejection && this.fallbackOf(candidate, rejection)
			if (!fallback) return true
			if (fallback === candidate.root) return false
			candidate.state = createSiteState(fallback, state.module)
			this.interpreter.sitesByNode.set(fallback, candidate.state)
		}
	}

	// a rejected validation, or a call to a static helper that makes no request of its own, leaves its callee or argument as the site
	private fallbackOf(
		candidate: SiteCandidate,
		rejection: DynamicValue
	): Node | undefined {
		const { fallbacks, state } = candidate
		if (rejection.code === "validation") {
			const validation = rejection.node
			if (
				validation.type === "CallExpression" &&
				rejection.module === state.module
			) {
				for (let i = fallbacks.length - 1; i >= 0; i--) {
					if (contains(validation.callee, fallbacks[i]))
						return fallbacks.splice(i)[0]
				}
			}
			// e.g. a static helper that only validates its argument
			return state.requests.length ? undefined : candidate.root
		}
		const call = state.node
		const fallback = fallbacks[fallbacks.length - 1]
		return (
				call.type === "CallExpression" &&
					fallback &&
					!contains(call.callee, fallback) &&
					state.requests.every(
						([node, module]) =>
							module === state.module &&
							call.arguments.some(arg => contains(arg, node))
					)
			) ?
				fallbacks.pop()
			:	undefined
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
		const severity = this.mode === "standalone" ? "error" : "warning"
		if (site.status === "rejected") {
			return [
				{
					...this.diagnostic(
						module,
						node,
						isCallback(rejectionOf(candidate.state)) ? "R2" : "R1",
						`${module.snippetOf(node)} cannot be precompiled`,
						site.reasons
					),
					severity
				}
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
		if (this.mode !== "standalone") return result
		for (const value of candidate.state.holes) {
			const standIn =
				isObjectLike(value) ? this.interpreter.standIns.get(value) : undefined
			if (!standIn?.isDefinition || !standIn.dynamic) continue
			const source = candidate.state.sourcesByValue.get(standIn.dynamic)
			const [node, origin] =
				source ? [source, module] : [standIn.node, standIn.module]
			result.push({
				...this.diagnostic(
					origin,
					node,
					"R4",
					`\`${origin.snippetOf(node)}\` is not static, so the site accepts it only as a Standard Schema that is not a Type`,
					chainOf(standIn.dynamic)
				),
				severity: "warning"
			})
		}
		return result
	}

	private checkConfiguration(module: SourceModule): Diagnostic[] {
		const result: Diagnostic[] = []
		const severity = this.mode === "standalone" ? "error" : "warning"
		let calls = 0
		for (const reference of module.scopes.references) {
			const binding = reference.binding
			if (binding?.kind !== "import") continue
			const target = this.graph.importOf(binding, module)
			if (target.kind !== "arktype" || target.name !== "configure") continue
			const call = reference.id.parent
			if (call?.type !== "CallExpression" || call.callee !== reference.id)
				continue
			calls++
			const problem =
				this.config === undefined ?
					"configure() is called, but the build has no `config` module"
				: this.config !== module.id ?
					`configure() is called outside the config module ${this.config}`
				: calls > 1 ? "configure() is called more than once"
				: undefined
			const reasons = problem ? [] : this.configurationProblemsOf(call, module)
			if (problem || reasons.length) {
				result.push({
					...this.diagnostic(
						module,
						call,
						"R3",
						problem ?? `${module.snippetOf(call)} is not static`,
						reasons
					),
					severity
				})
			}
		}
		return result
	}

	private configurationProblemsOf(
		call: CallExpression,
		module: SourceModule
	): string[] {
		const value = this.interpreter.evaluateSite(
			createSiteState(call.arguments[0] ?? call, module)
		)
		const dynamic = rejectionOf(value)
		if (dynamic) return chainOf(dynamic)
		const result: string[] = []
		const visit = (o: unknown) => {
			if (!isPlainContainer(o)) return
			for (const k of Reflect.ownKeys(o)) {
				const v = Reflect.get(o, k)
				const standIn =
					isObjectLike(v) ? this.interpreter.standIns.get(v) : undefined
				if (
					k === "description" &&
					standIn &&
					!(standIn.closure && staticBodyOf(standIn.closure.node))
				) {
					result.push(
						`the description writer at ${standIn.module.positionOf(standIn.node)} must be a static helper, since arktype calls it while defining types`
					)
				}
				visit(v)
			}
		}
		visit(value.value)
		return result
	}

	private checkStandalone(
		module: SourceModule,
		candidates: SiteCandidate[],
		sites: Site[]
	): Diagnostic[] {
		const result: Diagnostic[] = []
		for (const reference of module.scopes.references) {
			const binding = reference.binding
			if (binding?.kind !== "import" || reference.isWrite) continue
			const target = this.graph.importOf(binding, module)
			if (target.kind !== "arktype" || target.name in runtimeExports) continue
			const id = reference.id
			const parent = id.parent
			if (
				target.name === "configure" &&
				parent?.type === "CallExpression" &&
				parent.callee === id
			)
				continue
			if (
				target.name === "type" &&
				parent?.type === "MemberExpression" &&
				!parent.computed &&
				(parent.property as { name: string }).name === "errors"
			)
				continue
			if (
				sites.some(site => site.start <= id.start && id.end <= site.end) ||
				candidates.some(candidate => contains(candidate.state.node, id))
			)
				continue
			const fn = enclosingFunctionOf(id)
			if (fn && isFoldedHelper(fn, module)) continue
			result.push(
				this.diagnostic(
					module,
					id,
					"R4",
					`\`${binding.name}\` is used outside a precompiled site`,
					[]
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
			hint: this.mode === "cache" ? cacheHint : hintsByRule[rule]
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
	R2: "arktype runs this callback while defining the type, so the build computes its result. Make it a static helper: one expression or one `return` in the static subset.",
	R3: "The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module.",
	R4: `Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".`,
	parse: "The precompiled site throws the same ParseError when it is created."
}

const cacheHint = "Cache mode leaves this to arktype at runtime."

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

const isCallback = (dynamic: DynamicValue | undefined): boolean => {
	for (let link = dynamic; link; link = link.cause)
		if (link.code === "callback") return true
	return false
}

const chainOf = (dynamic: DynamicValue): string[] => {
	const result: string[] = []
	for (let link: DynamicValue | undefined = dynamic; link; link = link.cause)
		result.push(link.message)
	return result
}

const isMemberRead = (node: Node, root: Node): boolean => {
	for (node = unwrapExpression(node); node !== root; ) {
		if (node.type !== "MemberExpression") return false
		node = unwrapExpression(node.object)
	}
	return true
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
