import { hasArkKind } from "@ark/schema"
import { hashOf } from "@ark/util"
import type {
	Configured,
	FactoryParam,
	StandaloneExport,
	StandaloneFactory,
	StandaloneModules
} from "arktype/internal/standalone.ts"
import type MagicString from "magic-string"
import type { Node, Span } from "oxc-parser"
import type { SourceModule } from "./module.ts"
import { writeParseErrorThrower } from "./output.ts"
import { operatorOf, type Binding } from "./scope.ts"
import { isFoldable, siteNameOf, type Site } from "./sites.ts"
import type { RuntimeModule } from "./usage.ts"
type FactoryImport = [specifier: string, name: string, local: string]

export interface PlannedSites {
	namesBySite: Map<Site, string>
	factoriesBySite: Map<Site, SiteFactory>
	exportsByName: Record<string, StandaloneExport>
	// so far, the sites whose definitions it keeps in place
	folded: Site[]
}

export interface SiteFactory {
	params: FactoryParam[]
	spans: Span[]
	// e.g. the second `f` in `{ a: narrow(f), b: narrow(f) }`
	repeats: [span: Span, spanIndex: number][]
	inputs: string[]
	// inputs set before the site runs, so reading them can't throw
	inert: string[]
	// whose imports the call keeps, by the input passing each
	bindings: [input: string, binding: Binding][]
	imports: FactoryImport[]
}

export const emptyFactory = (): SiteFactory => ({
	params: [],
	spans: [],
	repeats: [],
	inputs: [],
	inert: [],
	bindings: [],
	imports: []
})

// what folding a module's sites has written so far
export interface Folding {
	module: SourceModule
	s: MagicString
	prefix: string
	validators: StandaloneModules
	// modules writing the same code share it
	specifier: string
	configured: Configured
	modules: Record<string, string>
	imports: Record<string, Record<string, string>>
	inputImports: Record<string, Record<string, string>>
	imported: Set<string>
	checking: Set<string>
	// the source a site's call keeps, which still reads the bindings it holds
	kept: Span[]
	passed: Binding[]
	// those a call reads at runtime
	read: Binding[]
	readsPassedBy?: (exported: string) => boolean
	// the first droppable site, where the config is fixed
	fixedAt: number
}

export const unplan = (plan: PlannedSites, site: Site): void => {
	delete plan.exportsByName[plan.namesBySite.get(site)!]
	plan.namesBySite.delete(site)
	plan.factoriesBySite.delete(site)
}

export const planFactory = (
	plan: PlannedSites,
	site: Site,
	factory: SiteFactory,
	tablesByValue: Map<unknown, number>
): void => {
	const name = `f${siteNameOf(site)}`
	plan.factoriesBySite.set(site, factory)
	plan.namesBySite.set(site, name)
	if (site.introspection) {
		plan.exportsByName[name] = {
			...site.introspection,
			data: site.value,
			params: factory.params,
			defaultChecks: site.defaultChecks
		}
		return
	}
	let table = tablesByValue.get(site.value)
	if (table === undefined)
		tablesByValue.set(site.value, (table = tablesByValue.size))
	plan.exportsByName[name] = {
		type: site.value as never,
		params: factory.params,
		internedBy: table,
		defaultChecks: site.defaultChecks
	} satisfies StandaloneFactory
}

// a site's validator, or where its definition throws a ParseError, its thrower
export const importFolded = (
	site: Site | undefined,
	exported: string,
	local: string,
	created: readonly string[] | undefined,
	{ validators, specifier, configured, modules, imports, prefix }: Folding
): void => {
	if (site?.parseError) {
		const thrower = writeParseErrorThrower(
			site.parseError.message,
			configured,
			site.progress
		)
		const throwerSpecifier = `~arktype/${hashOf(thrower)}`
		modules[throwerSpecifier] = thrower
		imports[throwerSpecifier] = { default: local }
		return
	}
	if (!(specifier in modules)) {
		modules[specifier] = validators.code
		Object.assign(modules, validators.modules)
	}
	const locals = (imports[specifier] ??= {})
	if (created) for (const read of created) locals[read] = `${prefix}_${read}`
	else locals[exported] = local
}

// a read of an imported validator, passed through what bakes its members
// first, or a dynamic import's namespace once it loads
export const bakeAt = (
	s: MagicString,
	module: SourceModule,
	read: Node,
	bake: string
): void => {
	if (read.type === "ImportExpression")
		return void s.appendLeft(read.end, `.then(${bake})`)
	const [, parent] = operatorOf(read)
	if (parent?.type === "Property" && parent.shorthand)
		return void s.appendLeft(read.end, `: ${bake}(${module.textOf(read)})`)
	s.prependRight(read.start, `${bake}(`)
	s.appendLeft(read.end, ")")
}

// parameters stay in place, so they evaluate in order, even for a value
export const spliceSite = (
	s: MagicString,
	site: Span,
	spans: readonly Span[],
	inputs: string[],
	opener: string,
	closer: string
): void => {
	const replace = (start: number, end: number, text: string) =>
		start === end ? s.appendLeft(start, text) : s.overwrite(start, end, text)
	let start = site.start
	let separator = opener
	for (const span of spans) {
		replace(start, span.start, separator)
		start = span.end
		separator = ", "
	}
	const read = inputs.map((input, i) => (i ? ", " : separator) + input)
	replace(start, site.end, `${read.join("")}${closer}`)
}

export const receive = (
	factory: SiteFactory,
	passedAs: PassedInput,
	param: FactoryParam
): void => {
	factory.inputs.push(passedAs.expression)
	if (passedAs.imported) factory.imports.push(passedAs.imported)
	if (passedAs.binding)
		factory.bindings.push([passedAs.expression, passedAs.binding])
	factory.params.push(param)
}

export interface PassedInput {
	expression: string
	label: string
	binding?: Binding
	// where no binding the site sees holds the input
	imported?: FactoryImport
}

const createsValidator = (site: Site) =>
	!site.introspection && !site.parseError && hasArkKind(site.value, "root")

export const runtimeModuleOf = (
	module: SourceModule,
	folded: Site[],
	kept: Span[],
	read: Binding[],
	inputs: Record<string, string[]>
): RuntimeModule => ({
	module,
	folded,
	kept: [
		...kept,
		...folded.flatMap(site => (site.definition ? [site.definition] : []))
	],
	passed: read,
	inputs,
	validators: folded.filter(site => createsValidator(site)),
	modules: folded.filter(site => hasArkKind(site.value, "module")),
	holdsOther: folded.some(
		site =>
			!createsValidator(site) &&
			!site.introspection &&
			!site.parseError &&
			isFoldable(site.value)
	)
})

const virtualSpecifier = /"(~arktype\/[^"]+)"/g

export const reachedModulesOf = (
	code: string,
	modules: Record<string, string>
): Record<string, string> => {
	const reached: Record<string, string> = {}
	const pending = [code]
	for (const read of pending) {
		for (const [, specifier] of read.matchAll(virtualSpecifier)) {
			if (specifier in reached || !(specifier in modules)) continue
			reached[specifier] = modules[specifier]
			pending.push(reached[specifier])
		}
	}
	return reached
}
