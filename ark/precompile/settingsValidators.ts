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

// ark/type/runtime.ts
var freeze = Object.freeze
var holesByValue = /* @__PURE__ */ new WeakMap()
var siteOf = (code, description) => ({ code, description })
var failsAt = (ctx, site, data, key, absent) =>
	!ctx?.failsAt || ctx.failsAt(site, data, key, absent)
var failsIn2 = (ctx, apply, value, key, missing, data) =>
	ctx?.failsAt ? ctx.failsIn(apply, value, key, missing, data) : !apply(value)
var applyIssues = (apply, data, onFail, Ctx = ArkIssues) => {
	const errors = new Ctx()
	apply(data, errors)
	return (
		!releasePath(errors).count ? data
		: onFail ? onFail(errors)
		: errors
	)
}
var holdHoles = (value, id, holes = []) => {
	holesByValue.set(value, [id, freeze(holes)])
	return value
}

// <stdin>
var union1isthmg14j2yp5 = /* @__PURE__ */ (() => {
	const intersectionlw1rtg0j6ieacAllows = (data, ctx) => {
		if (
			!(data.length >= 1) &&
			failsAt(ctx, siteOf("minLength", "a module path or false"), data)
		) {
			return false
		}
		return true
	}
	const unitb3uktk0sggngnAllows = (data, ctx) => {
		return (
			data === false ||
			!failsAt(ctx, siteOf("unit", "a module path or false"), data)
		)
	}
	const union1isthmg14j2yp5Allows = (data, ctx) => {
		return (
			typeof data === "string" ? intersectionlw1rtg0j6ieacAllows(data, ctx)
			: typeof data === "boolean" ? unitb3uktk0sggngnAllows(data, ctx)
			: !failsAt(ctx, siteOf("discriminant", "a module path or false"), data)
		)
	}
	return [union1isthmg14j2yp5Allows]
})()
var intersectiont0wl2m1h1rmjy = [
	(data, ctx) => {
		if (!(typeof data === "string")) {
			return !failsAt(ctx, siteOf("domain", "a path"), data)
		}
		if (
			!(data.length >= 1) &&
			failsAt(ctx, siteOf("minLength", "a path"), data)
		) {
			return false
		}
		return true
	}
]
var union1r63rcv0oogita = [
	(data, ctx) => {
		if (data === false) {
			return true
		}
		if (data === true) {
			return true
		}
		return !failsAt(ctx, siteOf("union", "boolean"), data)
	}
]
var intersectionvsyoxp0pnhios = /* @__PURE__ */ (([
	union1r63rcv0oogitaAllows
]) => {
	const intersectionvsyoxp0pnhiosAllows = (data, ctx) => {
		if (
			!(
				data !== null &&
				(typeof data === "object" || typeof data === "function")
			)
		) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure1th0g330wys10pAllows(data, ctx)
	}
	const structure1th0g330wys10pAllows = (data, ctx) => {
		if (
			!(
				!("assert" in data) ||
				!(
					!(data.assert === false || data.assert === true) &&
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.assert, "assert")
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
						union1r63rcv0oogitaAllows,
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
						union1r63rcv0oogitaAllows,
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
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.json, "json")
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
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.meta, "meta")
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
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.methods, "methods")
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
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.toJSON, "toJSON")
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
						union1r63rcv0oogitaAllows,
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
						union1r63rcv0oogitaAllows,
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
						union1r63rcv0oogitaAllows,
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
				if (failsAt(ctx, siteOf("undeclared"), data, k)) {
					return false
				}
			}
		}
		return true
	}
	return [intersectionvsyoxp0pnhiosAllows]
})(union1r63rcv0oogita)
var intersection1te1qta0k5vhot = /* @__PURE__ */ (() => {
	const intersection1te1qta0k5vhotAllows = (data, ctx) => {
		if (!Array.isArray(data)) {
			return !failsAt(ctx, siteOf("proto", "an array"), data)
		}
		return sequence1hvmhkl1knn3n0Allows(data, ctx)
	}
	const sequence1hvmhkl1knn3n0Allows = (data, ctx) => {
		for (let i = 0; i < data.length; i++) {
			if (
				!(typeof data[i] === "string") &&
				failsAt(ctx, siteOf("domain", "a string"), data, i)
			) {
				return false
			}
		}
		return true
	}
	return [intersection1te1qta0k5vhotAllows]
})()
var union6kxqtg10rkipy = [
	(data, ctx) => {
		switch (data) {
			case "helpers":
			case "none":
			case "types":
				return true
		}
		return !failsAt(
			ctx,
			siteOf("discriminant", '"helpers", "none" or "types"'),
			data
		)
	}
]
var union11i9clt1u4cqsg = [
	(data, ctx) => {
		switch (data) {
			case "all":
			case "first":
			case "none":
				return true
		}
		return !failsAt(
			ctx,
			siteOf("discriminant", '"all", "first" or "none"'),
			data
		)
	}
]
var union4isf150h0sa5a = [
	(data, ctx) => {
		switch (data) {
			case "always":
			case false:
			case true:
				return true
		}
		return !failsAt(
			ctx,
			siteOf("discriminant", '"always", false or true'),
			data
		)
	}
]
var unioniqlg4l0cjev87 = [
	(data, ctx) => {
		if (data === "size") {
			return true
		}
		if (data === "speed") {
			return true
		}
		return !failsAt(ctx, siteOf("union", '"size" or "speed"'), data)
	}
]
var union1i6u88914pn38t = [
	(data, ctx) => {
		if (data === "introspectable") {
			return true
		}
		if (data === "smallest") {
			return true
		}
		return !failsAt(
			ctx,
			siteOf("union", '"introspectable" or "smallest"'),
			data
		)
	}
]
var intersection14sndob0chfp8m = /* @__PURE__ */ ((
	[union1isthmg14j2yp5Allows],
	[intersectiont0wl2m1h1rmjyAllows],
	[intersectionvsyoxp0pnhiosAllows],
	[intersection1te1qta0k5vhotAllows],
	[union1r63rcv0oogitaAllows],
	[union6kxqtg10rkipyAllows],
	[union11i9clt1u4cqsgAllows],
	[union4isf150h0sa5aAllows],
	[unioniqlg4l0cjev87Allows],
	[union1i6u88914pn38tAllows]
) => {
	const intersection14sndob0chfp8mAllows = (data, ctx) => {
		if (
			!(
				data !== null &&
				(typeof data === "object" || typeof data === "function")
			)
		) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structureex6iz915tx8u9Allows(data, ctx)
	}
	const structureex6iz915tx8u9Allows = (data, ctx) => {
		if (
			!(
				!("allowUnsafe" in data) ||
				!(
					!(data.allowUnsafe === false || data.allowUnsafe === true) &&
					failsIn2(
						ctx,
						union1r63rcv0oogitaAllows,
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
				!failsIn2(ctx, union6kxqtg10rkipyAllows, data.checks, "checks")
			)
		) {
			return false
		}
		if (
			!(
				!("conditions" in data) ||
				!failsIn2(
					ctx,
					intersection1te1qta0k5vhotAllows,
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
				!failsIn2(ctx, union1isthmg14j2yp5Allows, data.config, "config")
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
						union1r63rcv0oogitaAllows,
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
				!failsIn2(ctx, intersectiont0wl2m1h1rmjyAllows, data.cwd, "cwd")
			)
		) {
			return false
		}
		if (
			!(
				!("declare" in data) ||
				!(
					!(data.declare === false || data.declare === true) &&
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.declare, "declare")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("errors" in data) ||
				!failsIn2(ctx, union11i9clt1u4cqsgAllows, data.errors, "errors")
			)
		) {
			return false
		}
		if (
			!(
				!("freeze" in data) ||
				!(
					!(data.freeze === false || data.freeze === true) &&
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.freeze, "freeze")
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
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.inline, "inline")
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
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.lazy, "lazy")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("members" in data) ||
				!failsIn2(ctx, intersectionvsyoxp0pnhiosAllows, data.members, "members")
			)
		) {
			return false
		}
		if (
			!(
				!("mutatesInput" in data) ||
				!failsIn2(
					ctx,
					union4isf150h0sa5aAllows,
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
					failsIn2(ctx, unioniqlg4l0cjev87Allows, data.optimize, "optimize")
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
						unioniqlg4l0cjev87Allows,
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
					failsIn2(ctx, union1i6u88914pn38tAllows, data.preset, "preset")
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
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.shadow, "shadow")
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
					intersectiont0wl2m1h1rmjyAllows,
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
				if (failsAt(ctx, siteOf("undeclared"), data, k)) {
					return false
				}
			}
		}
		return true
	}
	return [intersection14sndob0chfp8mAllows]
})(
	union1isthmg14j2yp5,
	intersectiont0wl2m1h1rmjy,
	intersectionvsyoxp0pnhios,
	intersection1te1qta0k5vhot,
	union1r63rcv0oogita,
	union6kxqtg10rkipy,
	union11i9clt1u4cqsg,
	union4isf150h0sa5a,
	unioniqlg4l0cjev87,
	union1i6u88914pn38t
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
var intersection16nhthi1pvp5ll = /* @__PURE__ */ ((
	[union1isthmg14j2yp5Allows],
	[intersectiont0wl2m1h1rmjyAllows],
	[intersectionvsyoxp0pnhiosAllows],
	[intersection1te1qta0k5vhotAllows],
	[union1r63rcv0oogitaAllows],
	[union6kxqtg10rkipyAllows],
	[union11i9clt1u4cqsgAllows],
	[union4isf150h0sa5aAllows],
	[unioniqlg4l0cjev87Allows],
	[union1i6u88914pn38tAllows]
) => {
	const intersection1iylfo31d25g9pAllows = (data, ctx) => {
		if (
			!(
				data !== null &&
				(typeof data === "object" || typeof data === "function")
			)
		) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structuredqtg4y0bf5hxgAllows(data, ctx)
	}
	const structuredqtg4y0bf5hxgAllows = (data, ctx) => {
		if (
			!(
				!("allowUnsafe" in data) ||
				!(
					!(data.allowUnsafe === false || data.allowUnsafe === true) &&
					failsIn2(
						ctx,
						union1r63rcv0oogitaAllows,
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
				!failsIn2(ctx, union6kxqtg10rkipyAllows, data.checks, "checks")
			)
		) {
			return false
		}
		if (
			!(
				!("conditions" in data) ||
				!failsIn2(
					ctx,
					intersection1te1qta0k5vhotAllows,
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
				!failsIn2(ctx, union1isthmg14j2yp5Allows, data.config, "config")
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
						union1r63rcv0oogitaAllows,
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
				!failsIn2(ctx, union11i9clt1u4cqsgAllows, data.errors, "errors")
			)
		) {
			return false
		}
		if (
			!(
				!("freeze" in data) ||
				!(
					!(data.freeze === false || data.freeze === true) &&
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.freeze, "freeze")
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
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.lazy, "lazy")
				)
			)
		) {
			return false
		}
		if (
			!(
				!("members" in data) ||
				!failsIn2(ctx, intersectionvsyoxp0pnhiosAllows, data.members, "members")
			)
		) {
			return false
		}
		if (
			!(
				!("mutatesInput" in data) ||
				!failsIn2(
					ctx,
					union4isf150h0sa5aAllows,
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
					failsIn2(ctx, unioniqlg4l0cjev87Allows, data.optimize, "optimize")
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
						unioniqlg4l0cjev87Allows,
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
					failsIn2(ctx, union1i6u88914pn38tAllows, data.preset, "preset")
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
					failsIn2(ctx, union1r63rcv0oogitaAllows, data.shadow, "shadow")
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
					intersectiont0wl2m1h1rmjyAllows,
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
				if (failsAt(ctx, siteOf("undeclared"), data, k)) {
					return false
				}
			}
		}
		return true
	}
	const intersection16nhthi1pvp5llAllows = (data, ctx) => {
		if (
			!(
				data !== null &&
				(typeof data === "object" || typeof data === "function")
			)
		) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structurev7edr10f85r66Allows(data, ctx)
	}
	const structurev7edr10f85r66Allows = (data, ctx) => {
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
					intersection1iylfo31d25g9pAllows,
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
				if (failsAt(ctx, siteOf("undeclared"), data, k)) {
					return false
				}
			}
		}
		return true
	}
	return [intersection16nhthi1pvp5llAllows]
})(
	union1isthmg14j2yp5,
	intersectiont0wl2m1h1rmjy,
	intersectionvsyoxp0pnhios,
	intersection1te1qta0k5vhot,
	union1r63rcv0oogita,
	union6kxqtg10rkipy,
	union11i9clt1u4cqsg,
	union4isf150h0sa5a,
	unioniqlg4l0cjev87,
	union1i6u88914pn38t
)
var created0
var created1
var get0 = () => {
	return (created0 ??= (() => {
		const validator0 = create10n7yuw0bfhpvo(
			intersection14sndob0chfp8m,
			"p4zr5a0k"
		)
		return validator0
	})())
}
var get1 = () => {
	return (created1 ??= (() => {
		const validator0 = create10n7yuw0bfhpvo(
			intersection16nhthi1pvp5ll,
			"tczpll1b"
		)
		return validator0
	})())
}
export { get1 as ArkJson, get0 as PrecompileOptions }
