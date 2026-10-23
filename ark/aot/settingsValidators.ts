/* eslint-disable */
// @ts-nocheck
// written by __tests__/writeSettings.ts from __tests__/settingsSchema.ts
// ark/util/facts.ts
var arkKind = " arkKind"

// ark/schema/shared/issues.ts
var releasedPath
var releasePath = errors => {
	releasedPath = errors._path
	return errors
}
var ArkIssues = class {
	constructor() {
		this._ = []
		this._path = releasedPath ?? []
		releasedPath = void 0
	}
	get [arkKind]() {
		return "errors"
	}
	/**
	 * The number of issues.
	 */
	get count() {
		return this._.length
	}
	/**
	 * Each issue, its message written when they are first read.
	 */
	get issues() {
		for (const issue of this._) issue.message ??= messageOf(issue)
		return this._
	}
	/**
	 * A human-readable summary of all errors.
	 */
	get summary() {
		let summary = ""
		for (const issue of this._)
			summary += (summary && "\n") + (issue.message ??= messageOf(issue))
		return summary
	}
	/**
	 * Throw a TraversalError based on these errors.
	 */
	throw() {
		throw new TraversalError(this)
	}
	toJSON() {
		return this.issues
	}
	toString() {
		return this.summary
	}
	/** @internal */
	failsAt(site, data, key, absent) {
		const issue = issueAt(this._path, site, data, key, absent)
		if (this._.length) this._.push(issue)
		else this._ = [issue]
		return this.failFast
	}
	/** @internal */
	failsIn(apply, value, key, missing, data) {
		return failsIn(this, this._path, apply, value, key, missing, data)
	}
}
var applyIssues = (apply, data, onFail, Ctx = ArkIssues) => {
	const errors = new Ctx()
	apply(data, errors)
	return (
		!releasePath(errors).count ? data
		: onFail ? onFail(errors)
		: errors
	)
}
var issueAt = (path, site, data, key, absent) => {
	let context = site.value ?? site
	if (key !== void 0) {
		path.push(key)
		if (absent || (site.missing && !(key in data))) context = site.missing
		else data = data[key]
	}
	const issuePath =
		site.path ? path.concat(site.path)
		: path.length === 1 ? [path[0]]
		: path.length === 2 ? [path[0], path[1]]
		: path.slice()
	const issue = {
		code: context.code,
		path: issuePath,
		data,
		expected: context.description,
		message: void 0
	}
	context.text?.(issue)
	if (key !== void 0) path.pop()
	return issue
}
var failsIn = (ctx, path, apply, value, key, missing, data) => {
	if (key === void 0) return !apply(value, ctx)
	if (missing && value === void 0 && !(key in data))
		return ctx.failsAt(missing, data, key, true)
	path.push(key)
	const continues = apply(value, ctx)
	path.pop()
	return !continues
}
var indexSegments = []
var messageOf = issue => {
	let path = ""
	for (const k of issue.path) {
		if (typeof k === "number")
			path += k < 256 ? (indexSegments[k] ??= `[${k}]`) : `[${k}]`
		else {
			if (path) path += "."
			path += typeof k === "string" ? k : String(k)
		}
	}
	if (!path) return problemOf(issue)
	return issue.problem === void 0 && issue.expected !== void 0 ?
			path + " must be " + issue.expected
		:	path + " " + problemOf(issue)
}
var problemOf = issue =>
	issue.problem ??
	(issue.expected === void 0 ?
		(problems[issue.code] ?? "is invalid")
	:	"must be " + issue.expected)
var problems = {
	required: "is missing",
	undeclared: "must be removed"
}
var TraversalError = class extends Error {
	name = "TraversalError"
	constructor(errors) {
		super(errors._thrown ?? errors.summary)
		Object.defineProperty(this, "arkErrors", { value: errors })
	}
}

// ark/type/checkers.ts
var check = (code, description, test) => ({ code, description, test })
var stringCheck = /* @__PURE__ */ check(
	"domain",
	"a string",
	data => typeof data === "string"
)
var arrayCheck = /* @__PURE__ */ check("proto", "an array", data =>
	Array.isArray(data)
)
var minLength = (
	rule,
	description = rule === 1 ? "non-empty" : `at least length ${rule}`
) => check("minLength", description, data => data.length >= rule)
var leaf = site => (data, ctx) => site.test(data) || !failsAt(ctx, site, data)
var printValue = value =>
	typeof value === "string" ? JSON.stringify(value) : `${value}`
var describeValues = values => {
	const printed = values.map(printValue)
	const last = printed.pop()
	return printed.length ? `${printed.join(", ")} or ${last}` : last
}
var unit = (value, description = printValue(value)) =>
	leaf(check("unit", description, data => data === value))
var booleanChecker = /* @__PURE__ */ leaf(
	/* @__PURE__ */ check("union", "boolean", data => typeof data === "boolean")
)
var intersection = (basis, refinements, within) => {
	const checker = (data, ctx) => {
		if (basis && !basis.test(data)) return !failsAt(ctx, basis, data)
		let passed = true
		for (const refinement of refinements) {
			if (!refinement.test(data)) {
				if (failsAt(ctx, refinement, data)) return false
				passed = false
			}
		}
		return !passed || !within || within(data, ctx)
	}
	checker.t = within?.t
	return checker
}
var elementsOf = element => (data, ctx) => {
	for (let i = 0; i < data.length; i++) {
		if (failsIn2(ctx, element, data[i], i)) return false
	}
	return true
}
var units = (values, code, description = describeValues(values)) =>
	leaf(check(code, description, data => values.includes(data)))
var domains = (cases, description) => {
	const site = { code: "discriminant", description }
	const caseOf = data =>
		cases[
			data === null ? "null"
			: typeof data === "function" ? "object"
			: typeof data
		]
	const checker = (data, ctx) => {
		const branch = caseOf(data)
		return branch ?
				branch === 1 || branch(data, ctx)
			:	!failsAt(ctx, site, data)
	}
	if (Object.values(cases).some(branch => branch.t))
		checker.t = data => caseOf(data).t?.(data) ?? data
	return checker
}

// ark/type/runtime.ts
var freeze = Object.freeze
var holesByValue = /* @__PURE__ */ new WeakMap()
var siteOf = (code, description) => ({ code, description })
var failsAt = (ctx, site, data, key, absent) =>
	!ctx?.failsAt || ctx.failsAt(site, data, key, absent)
var failsIn2 = (ctx, apply, value, key, missing, data) =>
	ctx?.failsAt ? ctx.failsIn(apply, value, key, missing, data) : !apply(value)
var holdHoles = (value, id, holes = []) => {
	holesByValue.set(value, [id, freeze(holes)])
	return value
}

// <stdin>
var union14uswwx1amnjhs = [
	domains(
		{
			string: intersection(0, [minLength(1, "a module path or false")]),
			boolean: unit(false, "a module path or false")
		},
		"a module path or false"
	)
]
var intersectionrduhod15l8w1v = [
	intersection(check("domain", "a path", stringCheck.test), [
		minLength(1, "a path")
	])
]
var union14x0uzw08oe5zu = [booleanChecker]
var intersection1jmpl21nkry5a = /* @__PURE__ */ (([
	union14x0uzw08oe5zuAllows
]) => {
	const intersection1jmpl21nkry5aAllows = (data, ctx) => {
		if (
			!(
				data !== null &&
				(typeof data === "object" || typeof data === "function")
			)
		) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structureohurqr1hn4luwAllows(data, ctx)
	}
	const structureohurqr1hn4luwAllows = (data, ctx) => {
		if (
			!(
				!("assert" in data) ||
				!(
					!(data.assert === false || data.assert === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.assert, "assert")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("description" in data) ||
				!(
					!(data.description === false || data.description === true) &&
					failsIn2(
						ctx,
						union14x0uzw08oe5zuAllows,
						data.description,
						"description"
					)
				)
			)
		) {
			return false
		}
		if (
			!(
				!("expression" in data) ||
				!(
					!(data.expression === false || data.expression === true) &&
					failsIn2(
						ctx,
						union14x0uzw08oe5zuAllows,
						data.expression,
						"expression"
					)
				)
			)
		) {
			return false
		}
		if (
			!(
				!("json" in data) ||
				!(
					!(data.json === false || data.json === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.json, "json")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("meta" in data) ||
				!(
					!(data.meta === false || data.meta === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.meta, "meta")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("methods" in data) ||
				!(
					!(data.methods === false || data.methods === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.methods, "methods")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("toJSON" in data) ||
				!(
					!(data.toJSON === false || data.toJSON === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.toJSON, "toJSON")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("toJsonSchema" in data) ||
				!(
					!(data.toJsonSchema === false || data.toJsonSchema === true) &&
					failsIn2(
						ctx,
						union14x0uzw08oe5zuAllows,
						data.toJsonSchema,
						"toJsonSchema"
					)
				)
			)
		) {
			return false
		}
		if (
			!(
				!("~standard" in data) ||
				!(
					!(data["~standard"] === false || data["~standard"] === true) &&
					failsIn2(
						ctx,
						union14x0uzw08oe5zuAllows,
						data["~standard"],
						"~standard"
					)
				)
			)
		) {
			return false
		}
		if (
			!(
				!("~standard.jsonSchema" in data) ||
				!(
					!(
						data["~standard.jsonSchema"] === false ||
						data["~standard.jsonSchema"] === true
					) &&
					failsIn2(
						ctx,
						union14x0uzw08oe5zuAllows,
						data["~standard.jsonSchema"],
						"~standard.jsonSchema"
					)
				)
			)
		) {
			return false
		}
		for (const k in data) {
			switch (k) {
				case "assert":
				case "description":
				case "expression":
				case "json":
				case "meta":
				case "methods":
				case "toJSON":
				case "toJsonSchema":
				case "~standard":
				case "~standard.jsonSchema":
					continue
			}
			if (Object.prototype.hasOwnProperty.call(data, k)) {
				if (failsAt(ctx, siteOf("undeclared", "removed"), data, k)) {
					return false
				}
			}
		}
		return true
	}
	return [intersection1jmpl21nkry5aAllows]
})(union14x0uzw08oe5zu)
var intersectiono73hy71ikqolc = [
	intersection(arrayCheck, [], elementsOf(leaf(stringCheck)))
]
var unionmw3thg1jwwghl = [units(["helpers", "none", "types"], "discriminant")]
var union18223x90tffyko = [units(["all", "first", "none"], "discriminant")]
var union1caeyb80ntsp13 = [units(["always", false, true], "discriminant")]
var union6fb4ik0zvpdon = [units(["size", "speed"], "union")]
var union10my86g003h9cp = [units(["introspectable", "smallest"], "union")]
var intersection10guff40d4s5h5 = /* @__PURE__ */ ((
	[union14uswwx1amnjhsAllows],
	[intersectionrduhod15l8w1vAllows],
	[intersection1jmpl21nkry5aAllows],
	[intersectiono73hy71ikqolcAllows],
	[union14x0uzw08oe5zuAllows],
	[unionmw3thg1jwwghlAllows],
	[union18223x90tffykoAllows],
	[union1caeyb80ntsp13Allows],
	[union6fb4ik0zvpdonAllows],
	[union10my86g003h9cpAllows]
) => {
	const intersection10guff40d4s5h5Allows = (data, ctx) => {
		if (
			!(
				data !== null &&
				(typeof data === "object" || typeof data === "function")
			)
		) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure1w081yv007nnqsAllows(data, ctx)
	}
	const structure1w081yv007nnqsAllows = (data, ctx) => {
		if (
			!(
				!("allowUnsafe" in data) ||
				!(
					!(data.allowUnsafe === false || data.allowUnsafe === true) &&
					failsIn2(
						ctx,
						union14x0uzw08oe5zuAllows,
						data.allowUnsafe,
						"allowUnsafe"
					)
				)
			)
		) {
			return false
		}
		if (
			!(
				!("checks" in data) ||
				!failsIn2(ctx, unionmw3thg1jwwghlAllows, data.checks, "checks")
			)
		) {
			return false
		}
		if (
			!(
				!("conditions" in data) ||
				!failsIn2(
					ctx,
					intersectiono73hy71ikqolcAllows,
					data.conditions,
					"conditions"
				)
			)
		) {
			return false
		}
		if (
			!(
				!("config" in data) ||
				!failsIn2(ctx, union14uswwx1amnjhsAllows, data.config, "config")
			)
		) {
			return false
		}
		if (
			!(
				!("countsKeys" in data) ||
				!(
					!(data.countsKeys === false || data.countsKeys === true) &&
					failsIn2(
						ctx,
						union14x0uzw08oe5zuAllows,
						data.countsKeys,
						"countsKeys"
					)
				)
			)
		) {
			return false
		}
		if (
			!(
				!("cwd" in data) ||
				!failsIn2(ctx, intersectionrduhod15l8w1vAllows, data.cwd, "cwd")
			)
		) {
			return false
		}
		if (
			!(
				!("declare" in data) ||
				!(
					!(data.declare === false || data.declare === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.declare, "declare")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("errors" in data) ||
				!failsIn2(ctx, union18223x90tffykoAllows, data.errors, "errors")
			)
		) {
			return false
		}
		if (
			!(
				!("freeze" in data) ||
				!(
					!(data.freeze === false || data.freeze === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.freeze, "freeze")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("inline" in data) ||
				!(
					!(data.inline === false || data.inline === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.inline, "inline")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("lazy" in data) ||
				!(
					!(data.lazy === false || data.lazy === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.lazy, "lazy")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("members" in data) ||
				!failsIn2(ctx, intersection1jmpl21nkry5aAllows, data.members, "members")
			)
		) {
			return false
		}
		if (
			!(
				!("mutatesInput" in data) ||
				!failsIn2(
					ctx,
					union1caeyb80ntsp13Allows,
					data.mutatesInput,
					"mutatesInput"
				)
			)
		) {
			return false
		}
		if (
			!(
				!("optimize" in data) ||
				!(
					!(data.optimize === "size" || data.optimize === "speed") &&
					failsIn2(ctx, union6fb4ik0zvpdonAllows, data.optimize, "optimize")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("optimizeErrors" in data) ||
				!(
					!(
						data.optimizeErrors === "size" || data.optimizeErrors === "speed"
					) &&
					failsIn2(
						ctx,
						union6fb4ik0zvpdonAllows,
						data.optimizeErrors,
						"optimizeErrors"
					)
				)
			)
		) {
			return false
		}
		if (
			!(
				!("preset" in data) ||
				!(
					!(data.preset === "introspectable" || data.preset === "smallest") &&
					failsIn2(ctx, union10my86g003h9cpAllows, data.preset, "preset")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("runtime" in data) ||
				!(
					!(data.runtime === "arktype") &&
					failsAt(ctx, siteOf("unit", '"arktype"'), data, "runtime")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("shadow" in data) ||
				!(
					!(data.shadow === false || data.shadow === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.shadow, "shadow")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("tsconfig" in data) ||
				!failsIn2(
					ctx,
					intersectionrduhod15l8w1vAllows,
					data.tsconfig,
					"tsconfig"
				)
			)
		) {
			return false
		}
		for (const k in data) {
			switch (k) {
				case "allowUnsafe":
				case "checks":
				case "conditions":
				case "config":
				case "countsKeys":
				case "cwd":
				case "declare":
				case "errors":
				case "freeze":
				case "inline":
				case "lazy":
				case "members":
				case "mutatesInput":
				case "optimize":
				case "optimizeErrors":
				case "preset":
				case "runtime":
				case "shadow":
				case "tsconfig":
					continue
			}
			if (Object.prototype.hasOwnProperty.call(data, k)) {
				if (failsAt(ctx, siteOf("undeclared", "removed"), data, k)) {
					return false
				}
			}
		}
		return true
	}
	return [intersection10guff40d4s5h5Allows]
})(
	union14uswwx1amnjhs,
	intersectionrduhod15l8w1v,
	intersection1jmpl21nkry5a,
	intersectiono73hy71ikqolc,
	union14x0uzw08oe5zu,
	unionmw3thg1jwwghl,
	union18223x90tffyko,
	union1caeyb80ntsp13,
	union6fb4ik0zvpdon,
	union10my86g003h9cp
)
var create10n7yuw0bfhpvo = ([allows], id, holes = []) => {
	const validator = (data, pipedFromCtx, onFail) =>
		allows(data) ? data : (
			applyIssues(
				allows,
				data,
				pipedFromCtx ? errors => pipedFromCtx.piped(errors) : onFail
			)
		)
	validator.allows = freeze(allows)
	return holdHoles(freeze(validator), id, holes)
}
var intersectionyvtk020jhsx8r = /* @__PURE__ */ ((
	[union14uswwx1amnjhsAllows],
	[intersectionrduhod15l8w1vAllows],
	[intersection1jmpl21nkry5aAllows],
	[intersectiono73hy71ikqolcAllows],
	[union14x0uzw08oe5zuAllows],
	[unionmw3thg1jwwghlAllows],
	[union18223x90tffykoAllows],
	[union1caeyb80ntsp13Allows],
	[union6fb4ik0zvpdonAllows],
	[union10my86g003h9cpAllows]
) => {
	const intersection18sff9d1fkwwnnAllows = (data, ctx) => {
		if (
			!(
				data !== null &&
				(typeof data === "object" || typeof data === "function")
			)
		) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure1sgwzmt1sqiw30Allows(data, ctx)
	}
	const structure1sgwzmt1sqiw30Allows = (data, ctx) => {
		if (
			!(
				!("allowUnsafe" in data) ||
				!(
					!(data.allowUnsafe === false || data.allowUnsafe === true) &&
					failsIn2(
						ctx,
						union14x0uzw08oe5zuAllows,
						data.allowUnsafe,
						"allowUnsafe"
					)
				)
			)
		) {
			return false
		}
		if (
			!(
				!("checks" in data) ||
				!failsIn2(ctx, unionmw3thg1jwwghlAllows, data.checks, "checks")
			)
		) {
			return false
		}
		if (
			!(
				!("conditions" in data) ||
				!failsIn2(
					ctx,
					intersectiono73hy71ikqolcAllows,
					data.conditions,
					"conditions"
				)
			)
		) {
			return false
		}
		if (
			!(
				!("config" in data) ||
				!failsIn2(ctx, union14uswwx1amnjhsAllows, data.config, "config")
			)
		) {
			return false
		}
		if (
			!(
				!("countsKeys" in data) ||
				!(
					!(data.countsKeys === false || data.countsKeys === true) &&
					failsIn2(
						ctx,
						union14x0uzw08oe5zuAllows,
						data.countsKeys,
						"countsKeys"
					)
				)
			)
		) {
			return false
		}
		if (
			!(
				!("errors" in data) ||
				!failsIn2(ctx, union18223x90tffykoAllows, data.errors, "errors")
			)
		) {
			return false
		}
		if (
			!(
				!("freeze" in data) ||
				!(
					!(data.freeze === false || data.freeze === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.freeze, "freeze")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("lazy" in data) ||
				!(
					!(data.lazy === false || data.lazy === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.lazy, "lazy")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("members" in data) ||
				!failsIn2(ctx, intersection1jmpl21nkry5aAllows, data.members, "members")
			)
		) {
			return false
		}
		if (
			!(
				!("mutatesInput" in data) ||
				!failsIn2(
					ctx,
					union1caeyb80ntsp13Allows,
					data.mutatesInput,
					"mutatesInput"
				)
			)
		) {
			return false
		}
		if (
			!(
				!("optimize" in data) ||
				!(
					!(data.optimize === "size" || data.optimize === "speed") &&
					failsIn2(ctx, union6fb4ik0zvpdonAllows, data.optimize, "optimize")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("optimizeErrors" in data) ||
				!(
					!(
						data.optimizeErrors === "size" || data.optimizeErrors === "speed"
					) &&
					failsIn2(
						ctx,
						union6fb4ik0zvpdonAllows,
						data.optimizeErrors,
						"optimizeErrors"
					)
				)
			)
		) {
			return false
		}
		if (
			!(
				!("preset" in data) ||
				!(
					!(data.preset === "introspectable" || data.preset === "smallest") &&
					failsIn2(ctx, union10my86g003h9cpAllows, data.preset, "preset")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("runtime" in data) ||
				!(
					!(data.runtime === "arktype") &&
					failsAt(ctx, siteOf("unit", '"arktype"'), data, "runtime")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("shadow" in data) ||
				!(
					!(data.shadow === false || data.shadow === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.shadow, "shadow")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("tsconfig" in data) ||
				!failsIn2(
					ctx,
					intersectionrduhod15l8w1vAllows,
					data.tsconfig,
					"tsconfig"
				)
			)
		) {
			return false
		}
		for (const k in data) {
			switch (k) {
				case "allowUnsafe":
				case "checks":
				case "conditions":
				case "config":
				case "countsKeys":
				case "errors":
				case "freeze":
				case "lazy":
				case "members":
				case "mutatesInput":
				case "optimize":
				case "optimizeErrors":
				case "preset":
				case "runtime":
				case "shadow":
				case "tsconfig":
					continue
			}
			if (Object.prototype.hasOwnProperty.call(data, k)) {
				if (failsAt(ctx, siteOf("undeclared", "removed"), data, k)) {
					return false
				}
			}
		}
		return true
	}
	const intersectionyvtk020jhsx8rAllows = (data, ctx) => {
		if (
			!(
				data !== null &&
				(typeof data === "object" || typeof data === "function")
			)
		) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure1yr6lw111fnvbiAllows(data, ctx)
	}
	const structure1yr6lw111fnvbiAllows = (data, ctx) => {
		if (
			!(
				!("$schema" in data) ||
				!(
					!(typeof data.$schema === "string") &&
					failsAt(ctx, siteOf("domain", "a string"), data, "$schema")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("precompile" in data) ||
				!failsIn2(
					ctx,
					intersection18sff9d1fkwwnnAllows,
					data.precompile,
					"precompile"
				)
			)
		) {
			return false
		}
		for (const k in data) {
			switch (k) {
				case "$schema":
				case "precompile":
					continue
			}
			if (Object.prototype.hasOwnProperty.call(data, k)) {
				if (failsAt(ctx, siteOf("undeclared", "removed"), data, k)) {
					return false
				}
			}
		}
		return true
	}
	return [intersectionyvtk020jhsx8rAllows]
})(
	union14uswwx1amnjhs,
	intersectionrduhod15l8w1v,
	intersection1jmpl21nkry5a,
	intersectiono73hy71ikqolc,
	union14x0uzw08oe5zu,
	unionmw3thg1jwwghl,
	union18223x90tffyko,
	union1caeyb80ntsp13,
	union6fb4ik0zvpdon,
	union10my86g003h9cp
)
var created0
var created1
var get0 = () => {
	return (created0 ??= (() => {
		const validator0 = create10n7yuw0bfhpvo(
			intersection10guff40d4s5h5,
			"1niblwp0"
		)
		return validator0
	})())
}
var get1 = () => {
	return (created1 ??= (() => {
		const validator0 = create10n7yuw0bfhpvo(
			intersectionyvtk020jhsx8r,
			"esa75p0g"
		)
		return validator0
	})())
}
export { get1 as ArkJson, get0 as PrecompileOptions }
