import {
	BaseScope,
	hasArkKind,
	nodeKinds,
	registerPrecompiledUnits,
	writePrecompiledUnits,
	type BaseNode,
	type BaseRoot,
	type PrecompiledUnit
} from "@ark/schema"

// checks cache mode (design/precompile.md §9) on arktype's suites: each acyclic root a suite finalizes binds the unit
// first written under its key, so the suites' assertions run on units written for other roots, and a key names one unit:
// pnpm testCache [mocha option...]

// a member's name holds its scope's content, which the key leaves out, as compiling does
const memberName = new RegExp(
	`\\b(?:${nodeKinds.join("|")})[0-9a-z]+(?:_\\d+)?(?=Allows|Apply|Transform)`,
	"g"
)

// a bind may read a node through either of two references to it, so the unit's code is compared as text and its bind by what it binds
const codeOf = (unit: string) => {
	const indicesByName: Record<string, number> = {}
	let names = 0
	return unit
		.slice(unit.indexOf("}, function"))
		.replace(memberName, name => `#${(indicesByName[name] ??= names++)}`)
}

const evaluate = (unit: string): PrecompiledUnit =>
	new Function(`return ${unit}`)()

const codesByKey: Record<string, string> = {}
const collisions: string[] = []
const unbound: string[] = []
let finalized = 0
let inlined = 0
// the units a finalized root was written, which it compares its binds with rather than writing them again
const finalizedUnits = new WeakMap<object, Record<string, string>>()

// a root binding a unit written for another binds what its own unit would
const checkBind =
	(key: string, bind: PrecompiledUnit[0]): PrecompiledUnit[0] =>
	(root, constants) => {
		const bound = bind(root, constants)
		// writing would read what a jitless scope's tests expect unread
		if (root.$.resolvedConfig.jitless) return bound
		const own = (finalizedUnits.get(root) ??
			writePrecompiledUnits([root as BaseRoot]))[key]
		const ownBound = own && evaluate(own)[0](root, constants)
		if (
			!ownBound ||
			bound.some(
				(values, i) =>
					values.length !== ownBound[i].length ||
					values.some((value, j) => value !== ownBound[i][j])
			)
		)
			collisions.push(`${root.expression}: binds another root's values`)
		return bound
	}

const register = (roots: BaseRoot[]) => {
	const units = writePrecompiledUnits(roots)
	const registered: Record<string, PrecompiledUnit> = {}
	for (const key in units) {
		const code = codeOf(units[key])
		if (codesByKey[key] === undefined) {
			codesByKey[key] = code
			const [bind, ...unit] = evaluate(units[key])
			registered[key] = [checkBind(key, bind), ...unit]
		} else if (codesByKey[key] !== code) {
			collisions.push(
				`${roots.map(root => root.expression).join(", ")}\n${codesByKey[key]}\n\n${code}`
			)
		}
	}
	registerPrecompiledUnits(registered)
	return units
}

const checkBound = (root: BaseRoot) => {
	finalized++
	if (root.precompilation!.startsWith("function anonymous"))
		unbound.push(root.expression)
}

const { finalize } = BaseScope.prototype
BaseScope.prototype.finalize = function <node extends BaseRoot>(
	this: BaseScope,
	node: node,
	jit = true
): node {
	// a jitless scope leaves its roots uncompiled, as its tests expect
	if (
		!jit ||
		node.compiledUnit ||
		node.includesAlias ||
		this.resolvedConfig.jitless
	)
		return finalize.call(this, node, jit) as node
	finalizedUnits.set(node, register([node]))
	finalize.call(this, node, jit)
	checkBound(node)
	return node
}

// a build writes units for a scope's exported roots and those their units call, so a root only a union inlines compiles at export()
const { export: exportScope } = BaseScope.prototype
// a scope binding precompiled units reads its references as it exports, which registers its roots' units
registerPrecompiledUnits({})
BaseScope.prototype.export = function (this: BaseScope, ...names: string[]) {
	if (this.resolved || this.resolvedConfig.jitless)
		return exportScope.apply(this, names)
	const roots: BaseRoot[] = []
	const referenced: BaseRoot[] = []
	let written: Record<string, string> = {}
	const references = Object.getOwnPropertyDescriptor(
		BaseScope.prototype,
		"references"
	)!.get!
	// export() reads its references once it has resolved its exports and before it binds them
	Object.defineProperty(this, "references", {
		configurable: true,
		get: () => {
			const value: readonly BaseNode[] = references.call(this)
			const resolutions: Record<string, unknown> | undefined = (this as never)[
				"_exportedResolutions"
			]
			if (resolutions && !roots.length) {
				for (const resolution of Object.values(resolutions)) {
					if (
						hasArkKind(resolution, "root") &&
						!resolution.compiledUnit &&
						!resolution.includesAlias
					)
						roots.push(resolution)
				}
				for (const node of value) {
					if (
						node.isRoot() &&
						!node.compiledUnit &&
						!node.includesAlias &&
						!roots.includes(node)
					)
						referenced.push(node)
				}
				written = register(roots)
			}
			return value
		}
	})
	try {
		const exported = exportScope.apply(this, names)
		// a scope exporting lazily reads no references as it exports
		void this.references
		return exported
	} finally {
		delete (this as { references?: unknown }).references
		for (const root of roots) if (root.compiledUnit) checkBound(root)
		for (const root of referenced) {
			if (!root.compiledUnit) continue
			// a build writes no unit for a root only a union inlines, so it compiles
			if (
				root.compiledUnit.toString().startsWith("function anonymous") &&
				!Object.keys(writePrecompiledUnits([root])).every(key => key in written)
			)
				inlined++
			else checkBound(root)
		}
	}
} as never

// a union discriminated by a symbol key or an object unit compiles a value it derives, which a bind can't reach
const expectedMisses = [
	"{ Symbol(tag): 0 } | { Symbol(tag): 1 }",
	"{ a: { Symbol(tag): 0 } | { Symbol(tag): 1 } }",
	"{ Symbol(lobmyS): 0 } | { Symbol(lobmyS): 1 }",
	'{ k: {"toJSON":"Function(toJSON)"} } | { k: "b", v: number }',
	"{ at: Function(later$hole_b) } | { at: Function(now$hole_a) }"
]

export const mochaHooks = {
	afterAll(): void {
		const misses = unbound.filter(
			expression => !expectedMisses.includes(expression)
		)
		console.log(collisions.slice(0, 5).join("\n\n=====\n\n"))
		console.log(
			`\n${collisions.length || misses.length ? "❌" : "✅"} ${finalized - unbound.length} of ${finalized} roots bound from ${Object.keys(codesByKey).length} units, ${inlined} only a union inlines compiled at export, ${collisions.length} keys naming two units; unexpectedly unbound: ${misses.slice(0, 20).join(", ")}`
		)
		if (collisions.length)
			throw new Error(`${collisions.length} keys name two units`)
		if (misses.length) throw new Error(`${misses.length} roots missed`)
	}
}
