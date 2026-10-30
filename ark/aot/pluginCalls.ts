import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import type { Node, ObjectExpression } from "oxc-parser"
import type { PrecompilePluginOptions } from "./driver.ts"
import { memberNameOf } from "./graph.ts"
import { printablePathOf, projectOf, throwBuildError } from "./host.ts"
import { SourceModule } from "./module.ts"
import {
	exportNameOf,
	loadedSourceOf,
	unwrapExpression,
	walk
} from "./scope.ts"
import { cliOptions } from "./settingsValidators.ts"

// e.g. `precompile.vite({ ... })` in vite.config.ts, which --check reads to
// check what the build does
export interface PluginCall {
	position: string
	label: string
	options: Record<string, unknown>
	// keys whose values aren't literals, or "*" for an argument that isn't one
	unread: string[]
}

const entries: Record<string, string> = Object.setPrototypeOf(
	{
		"@ark/aot/unplugin": "precompile",
		"@ark/aot/bun": "precompile",
		"@ark/aot/node": "register"
	},
	null
)

const turbopackLoader = "@ark/aot/turbopack"

const mentionsEntry = /["']@ark\/aot\/(?:unplugin|bun|node|turbopack)["']/

const scriptFile = /(?<!\.d)\.[cm]?[jt]sx?$/

// what reads options is a file at the project's root, like a bundler's config
export const pluginCallsIn = (cwd: string): PluginCall[] => {
	const project = projectOf(resolve(cwd))
	const root =
		existsSync(join(project, "package.json")) ? project : resolve(cwd)
	const result: PluginCall[] = []
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		if (!entry.isFile() || !scriptFile.test(entry.name)) continue
		const file = join(root, entry.name)
		const source = readFileSync(file, "utf8")
		if (!mentionsEntry.test(source)) continue
		const module = new SourceModule(
			file,
			source,
			printablePathOf(cwd, file) || entry.name
		)
		if (!module.parseErrors.length) result.push(...callsIn(module))
	}
	return result
}

const callsIn = (module: SourceModule): PluginCall[] => {
	const result: PluginCall[] = []
	// where a module loads an entry, in case none of its calls can be followed
	let loaded: Node | undefined
	let called = false
	walk(module.program, node => {
		if (node.type === "ObjectExpression") {
			const options = turbopackOptionsOf(node)
			if (options) {
				result.push({
					position: module.positionOf(node),
					label: `the ${turbopackLoader} loader`,
					...optionsOf(options, module)
				})
			}
		}
		if (node.type === "ImportDeclaration") {
			if (
				node.source.value in entries &&
				node.importKind !== "type" &&
				node.specifiers.some(
					specifier =>
						specifier.type !== "ImportSpecifier" ||
						specifier.importKind !== "type"
				)
			)
				loaded ??= node
			return true
		}
		if (entryOf(node) !== undefined) loaded ??= node
		if (node.type !== "CallExpression") return true
		const read = entryReadOf(node.callee, module)
		if (
			!read ||
			read[1][0] !== entries[read[0]] ||
			read[1].length > (read[0] === "@ark/aot/unplugin" ? 2 : 1)
		)
			return true
		called = true
		if (!node.arguments.length) return true
		result.push({
			position: module.positionOf(node),
			label: `${module.textOf(unwrapExpression(node.callee))}()`,
			...optionsOf(node.arguments[0], module)
		})
		return true
	})
	// e.g. a call through a variable, whose options the build may be passed
	if (loaded && !called) {
		result.push({
			position: module.positionOf(loaded),
			label: "the plugin",
			options: {},
			unread: ["*"]
		})
	}
	return result
}

const entryOf = (node: Node): string | undefined => {
	const source = loadedSourceOf(node)
	const specifier = source && literalOf(source)
	return typeof specifier === "string" && specifier in entries ?
			specifier
		:	undefined
}

// e.g. ["precompile", "vite"] for `precompile.vite`, `aot.precompile.vite` or
// `require("@ark/aot/unplugin").precompile.vite`
const entryReadOf = (
	expression: Node,
	module: SourceModule
): [entry: string, path: string[]] | undefined => {
	const node = unwrapExpression(expression)
	if (node.type === "AwaitExpression") return entryReadOf(node.argument, module)
	if (node.type === "MemberExpression") {
		const name = memberNameOf(node)
		const object = entryReadOf(node.object, module)
		return object && typeof name === "string" ?
				[object[0], [...object[1], name]]
			:	undefined
	}
	const entry = entryOf(node)
	if (entry !== undefined) return [entry, []]
	if (node.type !== "Identifier") return
	const binding = module.scopes.byId.get(node as never)?.binding
	const declaration = binding?.declaration
	if (
		declaration?.type === "ImportSpecifier" ||
		declaration?.type === "ImportNamespaceSpecifier"
	) {
		const source = (declaration.parent as { source: { value: string } }).source
			.value
		if (!(source in entries)) return
		return [
			source,
			declaration.type === "ImportSpecifier" ?
				[exportNameOf(declaration.imported)]
			:	[]
		]
	}
	if (
		binding?.kind !== "const" ||
		declaration?.type !== "VariableDeclarator" ||
		!declaration.init
	)
		return
	const init = entryReadOf(declaration.init, module)
	if (!init || declaration.id === binding.id) return init
	// e.g. `const { precompile } = require("@ark/aot/unplugin")`
	const property = binding.id.parent
	return (
			property?.type === "Property" &&
				property.value === binding.id &&
				property.parent === declaration.id &&
				!property.computed
		) ?
			[init[0], [...init[1], exportNameOf(property.key)]]
		:	undefined
}

// e.g. `{ loader: "@ark/aot/turbopack", options: { config: "..." } }`
const turbopackOptionsOf = (node: ObjectExpression): Node | undefined => {
	let isLoader = false
	let options: Node | undefined
	for (const property of node.properties) {
		if (property.type !== "Property" || property.computed) continue
		const key = exportNameOf(property.key)
		if (key === "loader")
			isLoader = loaderOf(property.value) === turbopackLoader
		else if (key === "options") options = property.value
	}
	return isLoader ? options : undefined
}

// a loader's name, or the one `require.resolve()` or `import.meta.resolve()` is passed
const loaderOf = (value: Node): unknown => {
	const node = unwrapExpression(value)
	if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression")
		return literalOf(node)
	const { object } = node.callee
	return (
			node.arguments.length &&
				memberNameOf(node.callee) === "resolve" &&
				((object.type === "Identifier" && object.name === "require") ||
					(object.type === "MetaProperty" && object.meta.name === "import"))
		) ?
			literalOf(node.arguments[0])
		:	undefined
}

const unread = Symbol("unread")

const optionsOf = (
	arg: Node,
	module: SourceModule
): Pick<PluginCall, "options" | "unread"> => {
	const node = unwrapExpression(arg)
	if (node.type !== "ObjectExpression") return { options: {}, unread: ["*"] }
	const options: Record<string, unknown> = {}
	const unreadKeys: string[] = []
	for (const property of node.properties) {
		if (
			property.type !== "Property" ||
			property.computed ||
			property.kind !== "init"
		)
			return { options: {}, unread: ["*"] }
		const key = exportNameOf(property.key)
		if (!(key in readOptions)) continue
		const value = literalOf(property.value)
		if (value === unread) {
			// prune changes only a warning
			if (key !== "prune") unreadKeys.push(key)
			continue
		}
		options[key] =
			(key === "config" || key === "tsconfig") && typeof value === "string" ?
				resolve(dirname(module.id), value)
			:	value
	}
	return { options, unread: unreadKeys }
}

const literalOf = (arg: Node): unknown => {
	const node = unwrapExpression(arg)
	switch (node.type) {
		case "Literal":
			return node.value instanceof RegExp ? unread : node.value
		case "TemplateLiteral":
			return node.expressions.length ? unread : node.quasis[0].value.cooked
		case "UnaryExpression": {
			const value = node.operator === "-" ? literalOf(node.argument) : unread
			return typeof value === "number" ? -value : unread
		}
		case "ArrayExpression": {
			const result: unknown[] = []
			for (const element of node.elements) {
				const value =
					element && element.type !== "SpreadElement" ?
						literalOf(element)
					:	unread
				if (value === unread) return unread
				result.push(value)
			}
			return result
		}
		case "ObjectExpression": {
			const result: Record<string, unknown> = {}
			for (const property of node.properties) {
				if (
					property.type !== "Property" ||
					property.computed ||
					property.kind !== "init"
				)
					return unread
				const value = literalOf(property.value)
				if (value === unread) return unread
				result[exportNameOf(property.key)] = value
			}
			return result
		}
		default:
			return unread
	}
}

// what changes what --check reports; a host's own, like `include`, doesn't
const readOptions: Record<string, unknown> = Object.fromEntries(
	Object.entries(cliOptions).filter(
		([name]) => name !== "inline" && name !== "declare" && name !== "cwd"
	)
)

const flagOf = (name: string) =>
	`--${name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)}`

// the options the build's calls pass, under those given
export const withPluginCalls = (
	calls: PluginCall[],
	given: PrecompilePluginOptions
): PrecompilePluginOptions => {
	for (const call of calls) {
		const missing = call.unread.filter(key => !isGiven(given, key))
		if (missing.length) throwBuildError(writeUnreadMessage(call, missing))
	}
	const merged: Record<string, unknown> = {}
	const setBy: Record<string, PluginCall> = {}
	for (const call of calls) {
		for (const [key, value] of Object.entries(call.options)) {
			if (isGiven(given, key)) continue
			const other = setBy[key]
			if (other && JSON.stringify(merged[key]) !== JSON.stringify(value)) {
				throwBuildError(
					`${call.position}  ${call.label} sets ${key} other than ${other.label} at ${other.position}, so --check can't tell which build to check\n  Pass the one to check as ${flagOf(key)}, or set it once in ark.json (or package.json's "ark" key).`
				)
			}
			setBy[key] = call
			merged[key] = value
		}
	}
	const members = (merged.members || given.members) && {
		...(merged.members as object),
		...given.members
	}
	const dependencies = (merged.dependencies || given.dependencies) && {
		...(merged.dependencies as object),
		...given.dependencies
	}
	return {
		...merged,
		...given,
		...(members && { members }),
		...(dependencies && { dependencies })
	}
}

const isGiven = (given: PrecompilePluginOptions, key: string) =>
	(given as Record<string, unknown>)[key] !== undefined

const writeUnreadMessage = (call: PluginCall, keys: string[]): string => {
	const [key] = keys
	const isOne = keys.length === 1 && key !== "*"
	const read =
		key === "*" ? "options" : keys.map(key => `\`${key}\``).join(", ")
	const fix =
		isOne ?
			`Set ${key} in ark.json (or package.json's "ark" key), as { "precompile": { "${key}": ... } }`
		:	`Set ${key === "*" ? "the options" : "them"} in ark.json (or package.json's "ark" key), as { "precompile": { ... } }`
	const flag =
		isOne ? `it to --check as ${flagOf(key)}` : "each to --check as a flag"
	return `${call.position}  --check can't read the ${read} ${call.label} is passed, so it can't check what the build does\n  ${fix}, which ${call.label} reads too, or pass ${flag}.`
}

// e.g. "vite.config.ts:5:22  precompile.vite() sets config, so --check does too"
export const pluginCallLinesOf = (
	calls: PluginCall[],
	given: PrecompilePluginOptions
): string[] =>
	calls.flatMap(call => {
		const keys = Object.keys(call.options).filter(key => !isGiven(given, key))
		return keys.length ?
				[
					`${call.position}  ${call.label} sets ${keys.join(", ")}, so --check does too`
				]
			:	[]
	})
