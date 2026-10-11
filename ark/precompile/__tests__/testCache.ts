import {
	BaseScope,
	nodeKinds,
	registerPrecompiledUnits,
	writePrecompiledUnits,
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

// a root binding a unit written for another binds what its own unit would
const checkBind =
	(key: string, bind: PrecompiledUnit[0]): PrecompiledUnit[0] =>
	(root, constants) => {
		const bound = bind(root, constants)
		// writing would read what a jitless scope's tests expect unread
		if (root.$.resolvedConfig.jitless) return bound
		const own = writePrecompiledUnits([root as BaseRoot])[key]
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
	finalized++
	const units = writePrecompiledUnits([node])
	const registered: Record<string, PrecompiledUnit> = {}
	for (const key in units) {
		const code = codeOf(units[key])
		if (codesByKey[key] === undefined) {
			codesByKey[key] = code
			const [bind, compiledUnit, dependencies] = evaluate(units[key])
			registered[key] = [checkBind(key, bind), compiledUnit, dependencies]
		} else if (codesByKey[key] !== code)
			collisions.push(`${node.expression}\n${codesByKey[key]}\n\n${code}`)
	}
	registerPrecompiledUnits(registered)
	finalize.call(this, node, jit)
	if (node.compiledUnit!.toString().startsWith("function anonymous"))
		unbound.push(node.expression)
	return node
}

export const mochaHooks = {
	afterAll(): void {
		console.log(collisions.slice(0, 5).join("\n\n=====\n\n"))
		console.log(
			`\n${collisions.length ? "❌" : "✅"} ${finalized - unbound.length} of ${finalized} roots bound from ${Object.keys(codesByKey).length} units, ${collisions.length} keys naming two units; unbound: ${unbound.join(", ")}`
		)
		if (collisions.length)
			throw new Error(`${collisions.length} keys name two units`)
	}
}
