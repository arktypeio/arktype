/* eslint-disable */
// @ts-nocheck
// written by __tests__/writeSettings.ts from __tests__/settingsSchema.ts
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
	(issue.expected !== void 0 ? "must be " + issue.expected
	: issue.code === "required" ? "is missing"
	: "is invalid")
var TraversalError = class extends Error {
	constructor(errors) {
		super(errors._thrown ?? errors.summary)
		this.name = "TraversalError"
		Object.defineProperty(this, "arkErrors", { value: errors })
	}
}

// ark/type/checkers.ts
var check = (code, description, test) => {
	const checker = (data, ctx) => test(data) || !failsAt(ctx, checker, data)
	checker.code = code
	checker.description = description
	checker.test = test
	return checker
}
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
var printValue = value =>
	typeof value === "string" ? JSON.stringify(value) : `${value}`
var describeValues = values => {
	const printed = values.map(printValue)
	const last = printed.pop()
	return printed.length ? `${printed.join(", ")} or ${last}` : last
}
var unit = (value, description = printValue(value)) =>
	check("unit", description, data => data === value)
var booleanChecker = /* @__PURE__ */ check(
	"union",
	"boolean",
	data => typeof data === "boolean"
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
var units = (
	values,
	code = "discriminant",
	description = describeValues(values)
) => check(code, description, data => values.includes(data))
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
var uniontxb0ck1na4t1c = [
	/* @__PURE__ */ domains(
		{
			string: /* @__PURE__ */ intersection(
				/* @__PURE__ */ check(
					"domain",
					"a module path or false",
					stringCheck.test
				),
				[/* @__PURE__ */ minLength(1, "a module path or false")]
			),
			boolean: /* @__PURE__ */ unit(false, "a module path or false")
		},
		"a module path or false"
	)
]
var intersection1saekmc1myv528 = [
	/* @__PURE__ */ intersection(
		/* @__PURE__ */ check("domain", "a path", stringCheck.test),
		[/* @__PURE__ */ minLength(1, "a path")]
	)
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
var intersection1q3cvf20wik4xk = [
	/* @__PURE__ */ intersection(
		arrayCheck,
		[],
		/* @__PURE__ */ elementsOf(stringCheck)
	)
]
var union13fa4p20868rbd = [/* @__PURE__ */ units(["helpers", "none", "types"])]
var union1y9gxj7031g78p = [/* @__PURE__ */ units(["all", "first", "none"])]
var unionjwbmn509wm1l0 = [/* @__PURE__ */ units(["always", false, true])]
var unionwltuhb0wt5e34 = [/* @__PURE__ */ units(["size", "speed"], "union")]
var union1yvbmuz0dlc3qf = [
	/* @__PURE__ */ units(["introspectable", "smallest"], "union")
]
var intersection1mhdhln0ehkfkv = /* @__PURE__ */ ((
	[uniontxb0ck1na4t1cAllows],
	[intersection1saekmc1myv528Allows],
	[intersection1jmpl21nkry5aAllows],
	[intersection1q3cvf20wik4xkAllows],
	[union14x0uzw08oe5zuAllows],
	[union13fa4p20868rbdAllows],
	[union1y9gxj7031g78pAllows],
	[unionjwbmn509wm1l0Allows],
	[unionwltuhb0wt5e34Allows],
	[union1yvbmuz0dlc3qfAllows]
) => {
	const intersection1mhdhln0ehkfkvAllows = (data, ctx) => {
		if (
			!(
				data !== null &&
				(typeof data === "object" || typeof data === "function")
			)
		) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structurek4olbd03nv54sAllows(data, ctx)
	}
	const structurek4olbd03nv54sAllows = (data, ctx) => {
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
				!("conditions" in data) ||
				!failsIn2(
					ctx,
					intersection1q3cvf20wik4xkAllows,
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
				!failsIn2(ctx, uniontxb0ck1na4t1cAllows, data.config, "config")
			)
		) {
			return false
		}
		if (
			!(
				!("creationChecks" in data) ||
				!failsIn2(
					ctx,
					union13fa4p20868rbdAllows,
					data.creationChecks,
					"creationChecks"
				)
			)
		) {
			return false
		}
		if (
			!(
				!("cwd" in data) ||
				!failsIn2(ctx, intersection1saekmc1myv528Allows, data.cwd, "cwd")
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
				!failsIn2(ctx, union1y9gxj7031g78pAllows, data.errors, "errors")
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
				!("jsonInput" in data) ||
				!(
					!(data.jsonInput === false || data.jsonInput === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.jsonInput, "jsonInput")
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
					unionjwbmn509wm1l0Allows,
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
					failsIn2(ctx, unionwltuhb0wt5e34Allows, data.optimize, "optimize")
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
						unionwltuhb0wt5e34Allows,
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
					failsIn2(ctx, union1yvbmuz0dlc3qfAllows, data.preset, "preset")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("prune" in data) ||
				!(
					!(data.prune === false || data.prune === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.prune, "prune")
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
					intersection1saekmc1myv528Allows,
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
				case "conditions":
				case "config":
				case "creationChecks":
				case "cwd":
				case "declare":
				case "errors":
				case "freeze":
				case "inline":
				case "jsonInput":
				case "lazy":
				case "members":
				case "mutatesInput":
				case "optimize":
				case "optimizeErrors":
				case "preset":
				case "prune":
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
	return [intersection1mhdhln0ehkfkvAllows]
})(
	uniontxb0ck1na4t1c,
	intersection1saekmc1myv528,
	intersection1jmpl21nkry5a,
	intersection1q3cvf20wik4xk,
	union14x0uzw08oe5zu,
	union13fa4p20868rbd,
	union1y9gxj7031g78p,
	unionjwbmn509wm1l0,
	unionwltuhb0wt5e34,
	union1yvbmuz0dlc3qf
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
var intersectionqms98d1vfykgm = /* @__PURE__ */ ((
	[uniontxb0ck1na4t1cAllows],
	[intersection1saekmc1myv528Allows],
	[intersection1jmpl21nkry5aAllows],
	[intersection1q3cvf20wik4xkAllows],
	[union14x0uzw08oe5zuAllows],
	[union13fa4p20868rbdAllows],
	[union1y9gxj7031g78pAllows],
	[unionjwbmn509wm1l0Allows],
	[unionwltuhb0wt5e34Allows],
	[union1yvbmuz0dlc3qfAllows]
) => {
	const intersection17fx3y30h4v3bzAllows = (data, ctx) => {
		if (
			!(
				data !== null &&
				(typeof data === "object" || typeof data === "function")
			)
		) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure140rzch1t1wndgAllows(data, ctx)
	}
	const structure140rzch1t1wndgAllows = (data, ctx) => {
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
				!("conditions" in data) ||
				!failsIn2(
					ctx,
					intersection1q3cvf20wik4xkAllows,
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
				!failsIn2(ctx, uniontxb0ck1na4t1cAllows, data.config, "config")
			)
		) {
			return false
		}
		if (
			!(
				!("creationChecks" in data) ||
				!failsIn2(
					ctx,
					union13fa4p20868rbdAllows,
					data.creationChecks,
					"creationChecks"
				)
			)
		) {
			return false
		}
		if (
			!(
				!("errors" in data) ||
				!failsIn2(ctx, union1y9gxj7031g78pAllows, data.errors, "errors")
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
				!("jsonInput" in data) ||
				!(
					!(data.jsonInput === false || data.jsonInput === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.jsonInput, "jsonInput")
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
					unionjwbmn509wm1l0Allows,
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
					failsIn2(ctx, unionwltuhb0wt5e34Allows, data.optimize, "optimize")
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
						unionwltuhb0wt5e34Allows,
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
					failsIn2(ctx, union1yvbmuz0dlc3qfAllows, data.preset, "preset")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("prune" in data) ||
				!(
					!(data.prune === false || data.prune === true) &&
					failsIn2(ctx, union14x0uzw08oe5zuAllows, data.prune, "prune")
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
					intersection1saekmc1myv528Allows,
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
				case "conditions":
				case "config":
				case "creationChecks":
				case "errors":
				case "freeze":
				case "jsonInput":
				case "lazy":
				case "members":
				case "mutatesInput":
				case "optimize":
				case "optimizeErrors":
				case "preset":
				case "prune":
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
	const intersectionqms98d1vfykgmAllows = (data, ctx) => {
		if (
			!(
				data !== null &&
				(typeof data === "object" || typeof data === "function")
			)
		) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structureq3edgy0f3ppobAllows(data, ctx)
	}
	const structureq3edgy0f3ppobAllows = (data, ctx) => {
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
					intersection17fx3y30h4v3bzAllows,
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
	return [intersectionqms98d1vfykgmAllows]
})(
	uniontxb0ck1na4t1c,
	intersection1saekmc1myv528,
	intersection1jmpl21nkry5a,
	intersection1q3cvf20wik4xk,
	union14x0uzw08oe5zu,
	union13fa4p20868rbd,
	union1y9gxj7031g78p,
	unionjwbmn509wm1l0,
	unionwltuhb0wt5e34,
	union1yvbmuz0dlc3qf
)
var created0
var created1
var get0 = () => {
	return (created0 ??= (() => {
		const validator0 = create10n7yuw0bfhpvo(
			intersection1mhdhln0ehkfkv,
			"1b860ff1"
		)
		return validator0
	})())
}
var get1 = () => {
	return (created1 ??= (() => {
		const validator0 = create10n7yuw0bfhpvo(
			intersectionqms98d1vfykgm,
			"xmqif716"
		)
		return validator0
	})())
}
export { get1 as ArkJson, get0 as PrecompileOptions }

export const cliOptions = {
	allowUnsafe: { type: "boolean", values: "true|false" },
	conditions: { type: "array", values: "a,b" },
	config: { type: "string", values: "path|false" },
	creationChecks: { type: "string", values: "helpers|none|types" },
	cwd: { type: "string", values: "path" },
	declare: { type: "boolean", values: "true|false" },
	errors: { type: "string", values: "all|first|none" },
	freeze: { type: "boolean", values: "true|false" },
	inline: { type: "boolean", values: "true|false" },
	jsonInput: { type: "boolean", values: "true|false" },
	lazy: { type: "boolean", values: "true|false" },
	members: { type: "object", values: "json" },
	mutatesInput: { type: "string", values: "always|true|false" },
	optimize: { type: "string", values: "size|speed" },
	optimizeErrors: { type: "string", values: "size|speed" },
	preset: { type: "string", values: "introspectable|smallest" },
	prune: { type: "boolean", values: "true|false" },
	runtime: { type: "string", values: "arktype" },
	shadow: { type: "boolean", values: "true|false" },
	tsconfig: { type: "string", values: "path" }
}
