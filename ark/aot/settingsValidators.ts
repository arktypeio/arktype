/* eslint-disable */
// @ts-nocheck
// written by __tests__/writeSettings.ts from __tests__/settingsSchema.ts
// ark/schema/shared/issueFeatures.ts
var reportsIndices = true
var writesText = true
var readsKeySites = true
var runsArktype = true

// ark/schema/shared/issues.ts
var ArkIssues = class {
	// assigned, as a target lowering class fields defines each with a helper
	constructor() {
		this._ = []
		this._p = []
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
	_at(site, data, key) {
		const path = this._p
		let context = (readsKeySites ? site.v : void 0) ?? site
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
		if (writesText) context.text?.(issue)
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
	for (const k of issue.path) {
		path +=
			reportsIndices && typeof k === "number" ?
				`[${k}]`
			:	(path && ".") + String(k)
	}
	return (path && path + " ") + problemOf(issue)
}
var problemOf = issue =>
	(writesText ? issue.problem : void 0) ??
	(issue.expected !== void 0 ? "must be " + issue.expected
	: issue.code === "required" ? "is missing"
	: "is invalid")
var TraversalError = class extends Error {
	constructor(errors) {
		super((runsArktype ? errors._t : void 0) ?? errors.summary)
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
	"discriminant",
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
	checker.description = basis ? basis.description : "present"
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
	checker.description = description
	if (Object.values(cases).some(branch => branch.t))
		checker.t = data => caseOf(data).t?.(data) ?? data
	return checker
}

// ark/type/runtime.ts
var freeze = Object.freeze
var siteOf = (code, description, message) => ({ code, description, x: message })
var failsAt = (ctx, site, data, key) => !ctx?._at || ctx._at(site, data, key)
var failsIn = (ctx, apply, data, key, missing) =>
	ctx?._at ? ctx._in(apply, data, key, missing) : !apply(data[key])
var holesByValue = /* @__PURE__ */ new WeakMap()
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
var intersection1ugq8wr1c5kol0 = /* @__PURE__ */ (([
	union14x0uzw08oe5zuAllows
]) => {
	const intersection1ugq8wr1c5kol0Allows = (data, ctx) => {
		if (!(data instanceof Object || Object(data) === data)) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure1fmi6pl0suwyb5Allows(data, ctx)
	}
	const structure1fmi6pl0suwyb5Allows = (data, ctx) => {
		if (
			!(
				!("assert" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "assert")
			)
		) {
			return false
		}
		if (
			!(
				!("meta" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "meta")
			)
		) {
			return false
		}
		if (
			!(
				!("~standard" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "~standard")
			)
		) {
			return false
		}
		if (
			!(
				!("methods" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "methods")
			)
		) {
			return false
		}
		if (
			!(
				!("expression" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "expression")
			)
		) {
			return false
		}
		if (
			!(
				!("description" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "description")
			)
		) {
			return false
		}
		if (
			!(
				!("json" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "json")
			)
		) {
			return false
		}
		if (
			!(
				!("toJSON" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "toJSON")
			)
		) {
			return false
		}
		if (
			!(
				!("toJsonSchema" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "toJsonSchema")
			)
		) {
			return false
		}
		if (
			!(
				!("~standard.jsonSchema" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "~standard.jsonSchema")
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
	return [intersection1ugq8wr1c5kol0Allows]
})(union14x0uzw08oe5zu)
var intersection1pta4mn06i3i5b = /* @__PURE__ */ (() => {
	const domainreo45i1f4q5lwAllows = stringCheck
	const union1rtk4qn1iaivvlAllows = /* @__PURE__ */ units(["aot", "arktype"])
	const intersection1pta4mn06i3i5bAllows = (data, ctx) => {
		if (!(data instanceof Object || Object(data) === data)) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure19yllhw1t15lvkAllows(data, ctx)
	}
	const structure19yllhw1t15lvkAllows = (data, ctx) => {
		const keys = Object.keys(data)
		for (let i = 0; i < keys.length; i++) {
			const k = keys[i]
			if (domainreo45i1f4q5lwAllows(k)) {
				if (
					!(data[k] === "aot" || data[k] === "arktype") &&
					failsIn(ctx, union1rtk4qn1iaivvlAllows, data, k)
				) {
					return false
				}
			}
		}
		return true
	}
	return [intersection1pta4mn06i3i5bAllows]
})()
var intersection1q3cvf20wik4xk = [
	/* @__PURE__ */ intersection(
		arrayCheck,
		[],
		/* @__PURE__ */ elementsOf(stringCheck)
	)
]
var union1wl1cwq0i7em6h = [
	/* @__PURE__ */ units(["introspectable", "smallest"])
]
var union1y9gxj7031g78p = [/* @__PURE__ */ units(["all", "first", "none"])]
var unionjwbmn509wm1l0 = [/* @__PURE__ */ units(["always", false, true])]
var union4aw8e70iusaxh = [/* @__PURE__ */ units(["size", "speed"])]
var union13fa4p20868rbd = [/* @__PURE__ */ units(["helpers", "none", "types"])]
var intersectionoahi0r11w3u37 = /* @__PURE__ */ ((
	[uniontxb0ck1na4t1cAllows],
	[intersection1saekmc1myv528Allows],
	[intersection1ugq8wr1c5kol0Allows],
	[intersection1pta4mn06i3i5bAllows],
	[intersection1q3cvf20wik4xkAllows],
	[union1wl1cwq0i7em6hAllows],
	[union1y9gxj7031g78pAllows],
	[unionjwbmn509wm1l0Allows],
	[union4aw8e70iusaxhAllows],
	[union14x0uzw08oe5zuAllows],
	[union13fa4p20868rbdAllows]
) => {
	const intersectionoahi0r11w3u37Allows = (data, ctx) => {
		if (!(data instanceof Object || Object(data) === data)) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structurecllg2k15khjp3Allows(data, ctx)
	}
	const structurecllg2k15khjp3Allows = (data, ctx) => {
		if (
			!(
				!("preset" in data) ||
				!failsIn(ctx, union1wl1cwq0i7em6hAllows, data, "preset")
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
				!failsIn(ctx, intersection1ugq8wr1c5kol0Allows, data, "members")
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
				!failsIn(ctx, union4aw8e70iusaxhAllows, data, "optimize")
			)
		) {
			return false
		}
		if (
			!(
				!("optimizeErrors" in data) ||
				!failsIn(ctx, union4aw8e70iusaxhAllows, data, "optimizeErrors")
			)
		) {
			return false
		}
		if (
			!(
				!("jsonInput" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "jsonInput")
			)
		) {
			return false
		}
		if (
			!(
				!("freeze" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "freeze")
			)
		) {
			return false
		}
		if (
			!(
				!("lazy" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "lazy")
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
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "shadow")
			)
		) {
			return false
		}
		if (
			!(
				!("prune" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "prune")
			)
		) {
			return false
		}
		if (
			!(
				!("allowUnsafe" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "allowUnsafe")
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
				!failsIn(ctx, intersection1pta4mn06i3i5bAllows, data, "dependencies")
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
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "inline")
			)
		) {
			return false
		}
		if (
			!(
				!("declare" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "declare")
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
	return [intersectionoahi0r11w3u37Allows]
})(
	uniontxb0ck1na4t1c,
	intersection1saekmc1myv528,
	intersection1ugq8wr1c5kol0,
	intersection1pta4mn06i3i5b,
	intersection1q3cvf20wik4xk,
	union1wl1cwq0i7em6h,
	union1y9gxj7031g78p,
	unionjwbmn509wm1l0,
	union4aw8e70iusaxh,
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
var intersection9q4hji1slqkz6 = /* @__PURE__ */ ((
	[uniontxb0ck1na4t1cAllows],
	[intersection1saekmc1myv528Allows],
	[intersection1ugq8wr1c5kol0Allows],
	[intersection1pta4mn06i3i5bAllows],
	[intersection1q3cvf20wik4xkAllows],
	[union1wl1cwq0i7em6hAllows],
	[union1y9gxj7031g78pAllows],
	[unionjwbmn509wm1l0Allows],
	[union4aw8e70iusaxhAllows],
	[union14x0uzw08oe5zuAllows],
	[union13fa4p20868rbdAllows]
) => {
	const intersection9q4hji1slqkz6Allows = (data, ctx) => {
		if (!(data instanceof Object || Object(data) === data)) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structuress07h119r9m68Allows(data, ctx)
	}
	const structuress07h119r9m68Allows = (data, ctx) => {
		if (
			!(
				!("preset" in data) ||
				!failsIn(ctx, union1wl1cwq0i7em6hAllows, data, "preset")
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
				!failsIn(ctx, intersection1ugq8wr1c5kol0Allows, data, "members")
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
				!failsIn(ctx, union4aw8e70iusaxhAllows, data, "optimize")
			)
		) {
			return false
		}
		if (
			!(
				!("optimizeErrors" in data) ||
				!failsIn(ctx, union4aw8e70iusaxhAllows, data, "optimizeErrors")
			)
		) {
			return false
		}
		if (
			!(
				!("jsonInput" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "jsonInput")
			)
		) {
			return false
		}
		if (
			!(
				!("freeze" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "freeze")
			)
		) {
			return false
		}
		if (
			!(
				!("lazy" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "lazy")
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
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "shadow")
			)
		) {
			return false
		}
		if (
			!(
				!("prune" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "prune")
			)
		) {
			return false
		}
		if (
			!(
				!("allowUnsafe" in data) ||
				!failsIn(ctx, union14x0uzw08oe5zuAllows, data, "allowUnsafe")
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
				!failsIn(ctx, intersection1pta4mn06i3i5bAllows, data, "dependencies")
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
	return [intersection9q4hji1slqkz6Allows]
})(
	uniontxb0ck1na4t1c,
	intersection1saekmc1myv528,
	intersection1ugq8wr1c5kol0,
	intersection1pta4mn06i3i5b,
	intersection1q3cvf20wik4xk,
	union1wl1cwq0i7em6h,
	union1y9gxj7031g78p,
	unionjwbmn509wm1l0,
	union4aw8e70iusaxh,
	union14x0uzw08oe5zu,
	union13fa4p20868rbd
)
var intersectionl3lldl13e04zo = /* @__PURE__ */ (([
	intersection9q4hji1slqkz6Allows
]) => {
	const intersectionl3lldl13e04zoAllows = (data, ctx) => {
		if (!(data instanceof Object || Object(data) === data)) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure1l4rrgc0hhi4jgAllows(data, ctx)
	}
	const structure1l4rrgc0hhi4jgAllows = (data, ctx) => {
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
				!failsIn(ctx, intersection9q4hji1slqkz6Allows, data, "precompile")
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
	return [intersectionl3lldl13e04zoAllows]
})(intersection9q4hji1slqkz6)
var intersection1sg3zud0lsdgwq = /* @__PURE__ */ (([
	intersection9q4hji1slqkz6Allows
]) => {
	const intersection1sg3zud0lsdgwqAllows = (data, ctx) => {
		if (!(data instanceof Object || Object(data) === data)) {
			return !failsAt(ctx, siteOf("domain", "an object"), data)
		}
		return structure1ysxv270l5ltapAllows(data, ctx)
	}
	const structure1ysxv270l5ltapAllows = (data, ctx) => {
		if (
			!(
				!("precompile" in data) ||
				!failsIn(ctx, intersection9q4hji1slqkz6Allows, data, "precompile")
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
	return [intersection1sg3zud0lsdgwqAllows]
})(intersection9q4hji1slqkz6)
var created0
var created1
var created2
var get0 = () => {
	return created0 === void 0 ?
			(created0 = (() => {
				const validator0 = create10n7yuw0bfhpvo(
					intersectionoahi0r11w3u37,
					"1m4kqtc1"
				)
				return validator0
			})())
		:	created0
}
var get1 = () => {
	return created1 === void 0 ?
			(created1 = (() => {
				const validator0 = create10n7yuw0bfhpvo(
					intersectionl3lldl13e04zo,
					"1egtc5a1"
				)
				return validator0
			})())
		:	created1
}
var get2 = () => {
	return created2 === void 0 ?
			(created2 = (() => {
				const validator0 = create10n7yuw0bfhpvo(
					intersection1sg3zud0lsdgwq,
					"6w8a9801"
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
