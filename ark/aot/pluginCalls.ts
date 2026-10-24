import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import type { Node, ObjectExpression } from "oxc-parser"
import type { PrecompilePluginOptions } from "./driver.ts"
import { printablePathOf, throwBuildError } from "./host.ts"
import { SourceModule } from "./module.ts"
import { exportNameOf, unwrapExpression, walk } from "./scope.ts"
import { cliOptions } from "./settingsValidators.ts"

// a call passing the build its options, as `precompile.vite({ ... })` in
// vite.config.ts, which the CLI reads so it checks what the build does
export interface PluginCall {
	position: string
	label: string
	options: Record<string, unknown>
	// keys whose values aren't literals, or "*" for an argument that isn't one
	unread: string[]
}

const entries: Record<string, (name: string) => boolean> = {
	"@ark/aot/unplugin": name => name === "precompile",
	"@ark/aot/bun": name => name === "precompile",
	"@ark/aot/node": name => name === "register"
}

const turbopackLoader = "@ark/aot/turbopack"

const mentionsEntry = /["']@ark\/aot\/(?:unplugin|bun|node|turbopack)["']/

const scriptFile = /(?<!\.d)\.[cm]?[jt]sx?$/

// what reads options is a file at the project's root, like a bundler's config
export const pluginCallsIn = (cwd: string): PluginCall[] => {
	let root = resolve(cwd)
	while (!existsSync(join(root, "package.json")) && dirname(root) !== root)
		root = dirname(root)
	if (!existsSync(join(root, "package.json"))) root = resolve(cwd)
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
		if (node.type !== "CallExpression" || !node.arguments.length) return true
		const callee = unwrapExpression(node.callee)
		const id =
			callee.type === "MemberExpression" ?
				unwrapExpression(callee.object)
			:	callee
		if (id.type !== "Identifier" || !isEntryImport(id, module)) return true
		result.push({
			position: module.positionOf(node),
			label: `${module.textOf(callee)}()`,
			...optionsOf(node.arguments[0], module)
		})
		return true
	})
	return result
}

const isEntryImport = (id: Node, module: SourceModule): boolean => {
	const binding = module.scopes.refsById.get(id as never)?.binding
	const declaration = binding?.declaration
	if (
		declaration?.type !== "ImportSpecifier" ||
		declaration.parent?.type !== "ImportDeclaration"
	)
		return false
	const isEntry = entries[declaration.parent.source.value]
	return !!isEntry?.(exportNameOf(declaration.imported))
}

// e.g. `{ loader: "@ark/aot/turbopack", options: { config: "..." } }`
const turbopackOptionsOf = (node: ObjectExpression): Node | undefined => {
	let isLoader = false
	let options: Node | undefined
	for (const property of node.properties) {
		if (property.type !== "Property" || property.computed) continue
		const key = exportNameOf(property.key)
		if (key === "loader")
			isLoader = literalOf(property.value) === turbopackLoader
		else if (key === "options") options = property.value
	}
	return isLoader ? options : undefined
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
			unreadKeys.push(key)
			continue
		}
		options[key] =
			(key === "config" || key === "tsconfig") && typeof value === "string" ?
				resolve(dirname(module.id), value)
			:	value
	}
	return { options, unread: unreadKeys }
}

// a value written as JSON would be, or `unread`
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

// the options the build's calls pass, under those given, or a build error
// saying what --check can't know
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
					`${call.position}  ${call.label} sets ${key} other than ${other.label} at ${other.position}, so --check can't tell which build to check\n  Pass the one to check as ${flagOf(key)}, or set it once in ark.json.`
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
	return { ...merged, ...given, ...(members && { members }) }
}

const isGiven = (given: PrecompilePluginOptions, key: string) =>
	(given as Record<string, unknown>)[key] !== undefined

const writeUnreadMessage = (call: PluginCall, keys: string[]): string => {
	const read =
		keys[0] === "*" ? "the options"
		: keys.length === 1 ? `the \`${keys[0]}\``
		: `the ${keys.map(key => `\`${key}\``).join(", ")}`
	const fix =
		keys[0] === "*" ?
			'Set the options in ark.json, as { "precompile": { ... } }'
		: keys.length === 1 ?
			`Set ${keys[0]} in ark.json, as { "precompile": { "${keys[0]}": ... } }`
		:	'Set them in ark.json, as { "precompile": { ... } }'
	const flag =
		keys[0] === "*" ? "each to --check as a flag"
		: keys.length === 1 ? `it to --check as ${flagOf(keys[0])}`
		: "each to --check as a flag"
	return `${call.position}  --check can't read ${read} ${call.label} is passed, so it can't check what the build does\n  ${fix}, which ${call.label} reads too, or pass ${flag}.`
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
