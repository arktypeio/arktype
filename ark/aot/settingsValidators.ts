/* eslint-disable */
// @ts-nocheck
// written by __tests__/writeSettings.ts from __tests__/settingsSchema.ts
// ark/schema/shared/issues.ts
var ArkIssues = class {
	/** @internal each issue in the order it was added */
	_ = []
	/** @internal the path a fused traversal is at */
	_p = []
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
	_at(site, data, key) {
		const path = this._p
		let context = site.v ?? site
		if (key !== void 0) {
			path.push(key)
			if (site.m && !(key in data)) context = site.m
			else data = data[key]
		}
		const issue = {
			code: context.code,
			path: path.slice(),
			data,
			expected: context.description,
			message: context.x
		}
		context.text?.(issue)
		if (key !== void 0) path.pop()
		this._.push(issue)
		return void 0
	}
	/** @internal */
	_in(apply, data, key, missing) {
		if (missing && !(key in data)) return this._at(missing, data, key)
		this._p.push(key)
		const continues = apply(data[key], this)
		this._p.pop()
		return !continues
	}
}
var applyIssues = (apply, data, onFail, Ctx = ArkIssues) => {
	const errors = new Ctx()
	apply(data, errors)
	return (
		!errors.count ? data
		: onFail ? onFail(errors)
		: errors
	)
}
var messageOf = issue => {
	let path = ""
	for (const k of issue.path)
		path += typeof k === "number" ? `[${k}]` : (path && ".") + String(k)
	return (path && path + " ") + problemOf(issue)
}
var problemOf = issue =>
	issue.problem ??
	(issue.expected !== void 0 ? "must be " + issue.expected
	: issue.code === "required" ? "is missing"
	: "is invalid")
var TraversalError = class extends Error {
	constructor(errors) {
		super(errors._t ?? errors.summary)
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
	for (let i = 0; i < data.length; i++)
		if (failsIn(ctx, element, data, i)) return false
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
var siteOf = (code, description, message) => ({ code, description, x: message })
var failsAt = (ctx, site, data, key) => !ctx?._at || ctx._at(site, data, key)
var failsIn = (ctx, apply, data, key, missing) =>
	ctx?._at ? ctx._in(apply, data, key, missing) : !apply(data[key])
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
var intersectionwj2vib0cwjy58 = /* @__PURE__ */ (([
	union14x0uzw08oe5zuAllows
]) => {
	const intersectionwj2vib0cwjy58Allows = (data, ctx) => {
		if (!(data instanceof Object || Object(data) === data)) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure1xnvvv91b3car9Allows(data, ctx)
	}
	const structure1xnvvv91b3car9Allows = (data, ctx) => {
		if (
			!(
				!("assert" in data) ||
				!(
					!(data.assert === false || data.assert === true) &&
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "assert")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "meta")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "~standard")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "methods")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "expression")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "description")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "json")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "toJSON")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "toJsonSchema")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "~standard.jsonSchema")
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
	return [intersectionwj2vib0cwjy58Allows]
})(union14x0uzw08oe5zu)
var intersection1o4l24l1vl2ydh = /* @__PURE__ */ (() => {
	const domainreo45i1f4q5lwAllows = stringCheck
	const unionku8p4418qg683Allows = /* @__PURE__ */ units(
		["aot", "arktype"],
		"union"
	)
	const intersection1o4l24l1vl2ydhAllows = (data, ctx) => {
		if (!(data instanceof Object || Object(data) === data)) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure1rb5bmn01957vkAllows(data, ctx)
	}
	const structure1rb5bmn01957vkAllows = (data, ctx) => {
		const keys = Object.keys(data)
		for (let i = 0; i < keys.length; i++) {
			const k = keys[i]
			if (domainreo45i1f4q5lwAllows(k)) {
				if (
					!(data[k] === "aot" || data[k] === "arktype") &&
					failsIn(ctx, unionku8p4418qg683Allows, data, k)
				) {
					return false
				}
			}
		}
		return true
	}
	return [intersection1o4l24l1vl2ydhAllows]
})()
var intersection1q3cvf20wik4xk = [
	/* @__PURE__ */ intersection(
		arrayCheck,
		[],
		/* @__PURE__ */ elementsOf(stringCheck)
	)
]
var union1yvbmuz0dlc3qf = [
	/* @__PURE__ */ units(["introspectable", "smallest"], "union")
]
var union1y9gxj7031g78p = [/* @__PURE__ */ units(["all", "first", "none"])]
var unionjwbmn509wm1l0 = [/* @__PURE__ */ units(["always", false, true])]
var unionwltuhb0wt5e34 = [/* @__PURE__ */ units(["size", "speed"], "union")]
var union13fa4p20868rbd = [/* @__PURE__ */ units(["helpers", "none", "types"])]
var intersection139rh990qijtgx = /* @__PURE__ */ ((
	[uniontxb0ck1na4t1cAllows],
	[intersection1saekmc1myv528Allows],
	[intersectionwj2vib0cwjy58Allows],
	[intersection1o4l24l1vl2ydhAllows],
	[intersection1q3cvf20wik4xkAllows],
	[union1yvbmuz0dlc3qfAllows],
	[union1y9gxj7031g78pAllows],
	[unionjwbmn509wm1l0Allows],
	[unionwltuhb0wt5e34Allows],
	[union14x0uzw08oe5zuAllows],
	[union13fa4p20868rbdAllows]
) => {
	const intersection139rh990qijtgxAllows = (data, ctx) => {
		if (!(data instanceof Object || Object(data) === data)) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structurex4rh2a06jpjdhAllows(data, ctx)
	}
	const structurex4rh2a06jpjdhAllows = (data, ctx) => {
		if (
			!(
				!("preset" in data) ||
				!(
					!(data.preset === "introspectable" || data.preset === "smallest") &&
					failsIn(ctx, union1yvbmuz0dlc3qfAllows, data, "preset")
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
				!("config" in data) ||
				!failsIn(ctx, uniontxb0ck1na4t1cAllows, data, "config")
			)
		) {
			return false
		}
		if (
			!(
				!("members" in data) ||
				!failsIn(ctx, intersectionwj2vib0cwjy58Allows, data, "members")
			)
		) {
			return false
		}
		if (
			!(
				!("errors" in data) ||
				!failsIn(ctx, union1y9gxj7031g78pAllows, data, "errors")
			)
		) {
			return false
		}
		if (
			!(
				!("mutatesInput" in data) ||
				!failsIn(ctx, unionjwbmn509wm1l0Allows, data, "mutatesInput")
			)
		) {
			return false
		}
		if (
			!(
				!("optimize" in data) ||
				!(
					!(data.optimize === "size" || data.optimize === "speed") &&
					failsIn(ctx, unionwltuhb0wt5e34Allows, data, "optimize")
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
					) && failsIn(ctx, unionwltuhb0wt5e34Allows, data, "optimizeErrors")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "jsonInput")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("freeze" in data) ||
				!(
					!(data.freeze === false || data.freeze === true) &&
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "freeze")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "lazy")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("creationChecks" in data) ||
				!failsIn(ctx, union13fa4p20868rbdAllows, data, "creationChecks")
			)
		) {
			return false
		}
		if (
			!(
				!("shadow" in data) ||
				!(
					!(data.shadow === false || data.shadow === true) &&
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "shadow")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "prune")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("allowUnsafe" in data) ||
				!(
					!(data.allowUnsafe === false || data.allowUnsafe === true) &&
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "allowUnsafe")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("conditions" in data) ||
				!failsIn(ctx, intersection1q3cvf20wik4xkAllows, data, "conditions")
			)
		) {
			return false
		}
		if (
			!(
				!("tsconfig" in data) ||
				!failsIn(ctx, intersection1saekmc1myv528Allows, data, "tsconfig")
			)
		) {
			return false
		}
		if (
			!(
				!("dependencies" in data) ||
				!failsIn(ctx, intersection1o4l24l1vl2ydhAllows, data, "dependencies")
			)
		) {
			return false
		}
		if (
			!(
				!("cwd" in data) ||
				!failsIn(ctx, intersection1saekmc1myv528Allows, data, "cwd")
			)
		) {
			return false
		}
		if (
			!(
				!("inline" in data) ||
				!(
					!(data.inline === false || data.inline === true) &&
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "inline")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("declare" in data) ||
				!(
					!(data.declare === false || data.declare === true) &&
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "declare")
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
				case "dependencies":
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
	return [intersection139rh990qijtgxAllows]
})(
	uniontxb0ck1na4t1c,
	intersection1saekmc1myv528,
	intersectionwj2vib0cwjy58,
	intersection1o4l24l1vl2ydh,
	intersection1q3cvf20wik4xk,
	union1yvbmuz0dlc3qf,
	union1y9gxj7031g78p,
	unionjwbmn509wm1l0,
	unionwltuhb0wt5e34,
	union14x0uzw08oe5zu,
	union13fa4p20868rbd
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
var intersection96uw0h19dj4zo = /* @__PURE__ */ ((
	[uniontxb0ck1na4t1cAllows],
	[intersection1saekmc1myv528Allows],
	[intersectionwj2vib0cwjy58Allows],
	[intersection1o4l24l1vl2ydhAllows],
	[intersection1q3cvf20wik4xkAllows],
	[union1yvbmuz0dlc3qfAllows],
	[union1y9gxj7031g78pAllows],
	[unionjwbmn509wm1l0Allows],
	[unionwltuhb0wt5e34Allows],
	[union14x0uzw08oe5zuAllows],
	[union13fa4p20868rbdAllows]
) => {
	const intersection96uw0h19dj4zoAllows = (data, ctx) => {
		if (!(data instanceof Object || Object(data) === data)) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structurescpxm00r1theAllows(data, ctx)
	}
	const structurescpxm00r1theAllows = (data, ctx) => {
		if (
			!(
				!("preset" in data) ||
				!(
					!(data.preset === "introspectable" || data.preset === "smallest") &&
					failsIn(ctx, union1yvbmuz0dlc3qfAllows, data, "preset")
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
				!("config" in data) ||
				!failsIn(ctx, uniontxb0ck1na4t1cAllows, data, "config")
			)
		) {
			return false
		}
		if (
			!(
				!("members" in data) ||
				!failsIn(ctx, intersectionwj2vib0cwjy58Allows, data, "members")
			)
		) {
			return false
		}
		if (
			!(
				!("errors" in data) ||
				!failsIn(ctx, union1y9gxj7031g78pAllows, data, "errors")
			)
		) {
			return false
		}
		if (
			!(
				!("mutatesInput" in data) ||
				!failsIn(ctx, unionjwbmn509wm1l0Allows, data, "mutatesInput")
			)
		) {
			return false
		}
		if (
			!(
				!("optimize" in data) ||
				!(
					!(data.optimize === "size" || data.optimize === "speed") &&
					failsIn(ctx, unionwltuhb0wt5e34Allows, data, "optimize")
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
					) && failsIn(ctx, unionwltuhb0wt5e34Allows, data, "optimizeErrors")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "jsonInput")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("freeze" in data) ||
				!(
					!(data.freeze === false || data.freeze === true) &&
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "freeze")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "lazy")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("creationChecks" in data) ||
				!failsIn(ctx, union13fa4p20868rbdAllows, data, "creationChecks")
			)
		) {
			return false
		}
		if (
			!(
				!("shadow" in data) ||
				!(
					!(data.shadow === false || data.shadow === true) &&
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "shadow")
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
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "prune")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("allowUnsafe" in data) ||
				!(
					!(data.allowUnsafe === false || data.allowUnsafe === true) &&
					failsIn(ctx, union14x0uzw08oe5zuAllows, data, "allowUnsafe")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("conditions" in data) ||
				!failsIn(ctx, intersection1q3cvf20wik4xkAllows, data, "conditions")
			)
		) {
			return false
		}
		if (
			!(
				!("tsconfig" in data) ||
				!failsIn(ctx, intersection1saekmc1myv528Allows, data, "tsconfig")
			)
		) {
			return false
		}
		if (
			!(
				!("dependencies" in data) ||
				!failsIn(ctx, intersection1o4l24l1vl2ydhAllows, data, "dependencies")
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
				case "dependencies":
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
	return [intersection96uw0h19dj4zoAllows]
})(
	uniontxb0ck1na4t1c,
	intersection1saekmc1myv528,
	intersectionwj2vib0cwjy58,
	intersection1o4l24l1vl2ydh,
	intersection1q3cvf20wik4xk,
	union1yvbmuz0dlc3qf,
	union1y9gxj7031g78p,
	unionjwbmn509wm1l0,
	unionwltuhb0wt5e34,
	union14x0uzw08oe5zu,
	union13fa4p20868rbd
)
var intersection1199sgb0d8uguh = /* @__PURE__ */ (([
	intersection96uw0h19dj4zoAllows
]) => {
	const intersection1199sgb0d8uguhAllows = (data, ctx) => {
		if (!(data instanceof Object || Object(data) === data)) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure1xfdu0o1oqu5n2Allows(data, ctx)
	}
	const structure1xfdu0o1oqu5n2Allows = (data, ctx) => {
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
				!failsIn(ctx, intersection96uw0h19dj4zoAllows, data, "precompile")
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
	return [intersection1199sgb0d8uguhAllows]
})(intersection96uw0h19dj4zo)
var intersectionzl2r971lulg5q = /* @__PURE__ */ (([
	intersection96uw0h19dj4zoAllows
]) => {
	const intersectionzl2r971lulg5qAllows = (data, ctx) => {
		if (!(data instanceof Object || Object(data) === data)) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure1s73fqh1700koyAllows(data, ctx)
	}
	const structure1s73fqh1700koyAllows = (data, ctx) => {
		if (
			!(
				!("precompile" in data) ||
				!failsIn(ctx, intersection96uw0h19dj4zoAllows, data, "precompile")
			)
		) {
			return false
		}
		if (
			!(
				!("aot" in data) ||
				!(
					!(data.aot === true) &&
					failsAt(ctx, siteOf("unit", "true"), data, "aot")
				)
			)
		) {
			return false
		}
		for (const k in data) {
			switch (k) {
				case "aot":
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
	return [intersectionzl2r971lulg5qAllows]
})(intersection96uw0h19dj4zo)
var created0
var created1
var created2
var get0 = () => {
	return created0 === void 0 ?
			(created0 = (() => {
				const validator0 = create10n7yuw0bfhpvo(
					intersection139rh990qijtgx,
					"tm4cwb17"
				)
				return validator0
			})())
		:	created0
}
var get1 = () => {
	return created1 === void 0 ?
			(created1 = (() => {
				const validator0 = create10n7yuw0bfhpvo(
					intersection1199sgb0d8uguh,
					"19ncfm81"
				)
				return validator0
			})())
		:	created1
}
var get2 = () => {
	return created2 === void 0 ?
			(created2 = (() => {
				const validator0 = create10n7yuw0bfhpvo(
					intersectionzl2r971lulg5q,
					"17d23qx0"
				)
				return validator0
			})())
		:	created2
}
export { get1 as ArkJson, get2 as PackageArk, get0 as PrecompileOptions }

export const cliOptions = {
	allowUnsafe: { type: "boolean", values: "true|false" },
	conditions: { type: "array", values: "a,b" },
	config: { type: "string", values: "path|false" },
	creationChecks: { type: "string", values: "helpers|none|types" },
	cwd: { type: "string", values: "path" },
	declare: { type: "boolean", values: "true|false" },
	dependencies: { type: "object", values: "json" },
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
