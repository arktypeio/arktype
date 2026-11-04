/* eslint-disable */
// @ts-nocheck
// written by __tests__/writeSettings.ts from __tests__/settingsSchema.ts
// ark/util/domain.ts
var hasDomain = (data, kind) => domainOf(data) === kind
var domainOf = data => {
	const builtinType = typeof data
	return (
		builtinType === "object" ?
			data === null ?
				"null"
			:	"object"
		: builtinType === "function" ? "object"
		: builtinType
	)
}

// ark/util/records.ts
var hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k)

// ark/schema/shared/issueFeatures.ts
var reportsIndices = true
var bracketsKeys = true
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
var foundErrors = (apply, data, onFail, Ctx = ArkIssues) => {
	const errors = new Ctx()
	apply(data, errors)
	if (!errors._.length) errors._at({ code: "predicate" }, data)
	return onFail ? onFail(errors) : errors
}
var messageOf = issue => {
	let path = ""
	for (const k of issue.path) {
		path +=
			bracketsKeys && !/^[$_a-z][\w$]*$/i.test(String(k)) ?
				`[${JSON.stringify(k) ?? String(k)}]`
			: reportsIndices && typeof k === "number" ? `[${k}]`
			: (path && ".") + String(k)
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
var numberCheck = /* @__PURE__ */ check("domain", "a number", data =>
	Number.isFinite(data)
)
var objectCheck = /* @__PURE__ */ check("domain", "an object", data =>
	typeof data === "object" ? data !== null : typeof data === "function"
)
var arrayCheck = /* @__PURE__ */ check("proto", "an array", data =>
	Array.isArray(data)
)
var min = (
	rule,
	exclusive,
	description = rule === 0 ?
		exclusive ? "positive"
		:	"non-negative"
	:	`${exclusive ? "more than" : "at least"} ${rule}`
) =>
	check(
		"min",
		description,
		exclusive ? data => data > rule : data => data >= rule
	)
var minLength = (
	rule,
	description = rule === 1 ? "non-empty" : `at least length ${rule}`
) => check("minLength", description, data => data.length >= rule)
var divisor = (
	rule,
	description = rule === 1 ? "an integer"
	: rule === 2 ? "even"
	: `a multiple of ${rule}`
) => check("divisor", description, data => data % rule === 0)
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
var optional = (checker, ...value) => {
	const wrapped = (data, ctx) => checker(data, ctx)
	wrapped.o = 1
	wrapped.d = value
	wrapped.t = checker.t
	return wrapped
}
var failsValue = (ctx, checker, data, k, value) =>
	ctx?._at ?
		(!checker.t || !checker(value)) && ctx._in(checker, data, k)
	:	!checker(value)
var failsProps = (declared, data, ctx) => {
	for (const k in declared) {
		const value = data[k]
		if (
			value === void 0 && !(k in data) ?
				!declared[k].o &&
				failsAt(ctx, requiredSiteOf(declared[k].description), data, k)
			:	failsValue(ctx, declared[k], data, k, value)
		)
			return true
	}
	return false
}
var closedProps = (declared, description = "removed") => {
	const removed = siteOf("undeclared", description)
	const checker = (data, ctx) => {
		if (!objectCheck.test(data)) return !failsAt(ctx, objectCheck, data)
		if (failsProps(declared, data, ctx)) return false
		for (const k in data) {
			if (
				!hasOwn(declared, k) &&
				hasOwn(data, k) &&
				failsAt(ctx, removed, data, k)
			)
				return false
		}
		return true
	}
	checker.description = objectCheck.description
	return checker
}
var elementsOf = element => (data, ctx) => {
	for (let i = 0; i < data.length; i++)
		if (failsValue(ctx, element, data, i, data[i])) return false
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
var requiredSiteOf = description => ({
	m: { code: "required", description }
})
var failsAt = (ctx, site, data, key) => !ctx?._at || ctx._at(site, data, key)
var failsIn = (ctx, apply, data, key, missing) =>
	ctx?._at ? ctx._in(apply, data, key, missing) : !apply(data[key])
var checkedDefaultOf = ([id, holes]) => {
	let table = checkedDefaults.next(id)
	for (const hole of holes) table = table.next(hole)
	return table
}
var holesByValue = /* @__PURE__ */ new WeakMap()
var holdHoles = (value, id, holes = []) => {
	holesByValue.set(value, [id, freeze(holes)])
	return value
}
var InternTable = class _InternTable {
	value = void 0
	tablesByObject = /* @__PURE__ */ new WeakMap()
	// a symbol is a WeakMap key only in engines since ES2023
	tablesByValue = /* @__PURE__ */ new Map()
	next(hole) {
		const tables =
			hasDomain(hole, "object") ? this.tablesByObject : this.tablesByValue
		let next = tables.get(hole)
		if (!next) tables.set(hole, (next = new _InternTable()))
		return next
	}
}
var tablesByKey = /* @__PURE__ */ new Map()
var internedTable = key => {
	let table = tablesByKey.get(key)
	if (!table) tablesByKey.set(key, (table = new InternTable()))
	return table
}
var checkedDefaults = /* @__PURE__ */ new InternTable()
var intern = (table, holes, create, defaults = []) => {
	for (const hole of holes) table = table.next(hole)
	if (
		table.value !== void 0 &&
		defaults.some(key => !checkedDefaultOf(key).value)
	)
		create()
	return (table.value ??= create())
}
var interned = (key, create, ...args) =>
	intern(internedTable(key), [], () => create(...args))

// <stdin>
var intersectionkmdrl70pxuocb = [
	/* @__PURE__ */ closedProps({
		assert: /* @__PURE__ */ optional(booleanChecker),
		meta: /* @__PURE__ */ optional(booleanChecker),
		"~standard": /* @__PURE__ */ optional(booleanChecker),
		methods: /* @__PURE__ */ optional(booleanChecker),
		expression: /* @__PURE__ */ optional(booleanChecker),
		description: /* @__PURE__ */ optional(booleanChecker),
		json: /* @__PURE__ */ optional(booleanChecker),
		toJSON: /* @__PURE__ */ optional(booleanChecker),
		toJsonSchema: /* @__PURE__ */ optional(booleanChecker),
		"~standard.jsonSchema": /* @__PURE__ */ optional(booleanChecker)
	})
]
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
var intersection1e1eu9q0xorpuh = /* @__PURE__ */ ((
	[intersectionkmdrl70pxuocbAllows],
	[intersection1pta4mn06i3i5bAllows]
) => {
	const intersection1e1eu9q0xorpuhAllows = /* @__PURE__ */ closedProps({
		preset: /* @__PURE__ */ optional(
			/* @__PURE__ */ units(["introspectable", "smallest"])
		),
		runtime: /* @__PURE__ */ optional(/* @__PURE__ */ unit("arktype")),
		config: /* @__PURE__ */ optional(
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
		),
		members: /* @__PURE__ */ optional(intersectionkmdrl70pxuocbAllows),
		errors: /* @__PURE__ */ optional(
			/* @__PURE__ */ units(["all", "first", "none"])
		),
		mutatesInput: /* @__PURE__ */ optional(
			/* @__PURE__ */ units(["always", false, true])
		),
		optimize: /* @__PURE__ */ optional(
			/* @__PURE__ */ units(["size", "speed"])
		),
		optimizeErrors: /* @__PURE__ */ optional(
			/* @__PURE__ */ units(["size", "speed"])
		),
		jsonInput: /* @__PURE__ */ optional(booleanChecker),
		bakedLimit: /* @__PURE__ */ optional(
			/* @__PURE__ */ intersection(
				/* @__PURE__ */ check(
					"domain",
					"the characters a site's baked introspection may total",
					numberCheck.test
				),
				[
					/* @__PURE__ */ divisor(
						1,
						"the characters a site's baked introspection may total"
					),
					/* @__PURE__ */ min(
						0,
						1,
						"the characters a site's baked introspection may total"
					)
				]
			)
		),
		freeze: /* @__PURE__ */ optional(booleanChecker),
		lazy: /* @__PURE__ */ optional(booleanChecker),
		creationChecks: /* @__PURE__ */ optional(
			/* @__PURE__ */ units(["helpers", "none", "types"])
		),
		shadow: /* @__PURE__ */ optional(booleanChecker),
		prune: /* @__PURE__ */ optional(booleanChecker),
		allowUnsafe: /* @__PURE__ */ optional(booleanChecker),
		conditions: /* @__PURE__ */ optional(
			/* @__PURE__ */ intersection(
				arrayCheck,
				[],
				/* @__PURE__ */ elementsOf(stringCheck)
			)
		),
		tsconfig: /* @__PURE__ */ optional(
			/* @__PURE__ */ intersection(
				/* @__PURE__ */ check("domain", "a path", stringCheck.test),
				[/* @__PURE__ */ minLength(1, "a path")]
			)
		),
		dependencies: /* @__PURE__ */ optional(intersection1pta4mn06i3i5bAllows),
		cwd: /* @__PURE__ */ optional(
			/* @__PURE__ */ intersection(
				/* @__PURE__ */ check("domain", "a path", stringCheck.test),
				[/* @__PURE__ */ minLength(1, "a path")]
			)
		),
		inline: /* @__PURE__ */ optional(booleanChecker),
		declare: /* @__PURE__ */ optional(booleanChecker)
	})
	return [intersection1e1eu9q0xorpuhAllows]
})(intersectionkmdrl70pxuocb, intersection1pta4mn06i3i5b)
var create12fpvlf14u2zct = ([allows], id, holes = []) => {
	const validator = (data, pipedFromCtx, onFail) =>
		allows(data) ?
			(allows.t?.(data) ?? data)
		:	foundErrors(
				allows,
				data,
				pipedFromCtx ? errors => pipedFromCtx.piped(errors) : onFail
			)
	validator.allows = freeze(allows)
	return holdHoles(freeze(validator), id, holes)
}
var intersectionwzvg801kidwck = /* @__PURE__ */ ((
	[intersectionkmdrl70pxuocbAllows],
	[intersection1pta4mn06i3i5bAllows]
) => {
	const intersectionwzvg801kidwckAllows = /* @__PURE__ */ closedProps({
		preset: /* @__PURE__ */ optional(
			/* @__PURE__ */ units(["introspectable", "smallest"])
		),
		runtime: /* @__PURE__ */ optional(/* @__PURE__ */ unit("arktype")),
		config: /* @__PURE__ */ optional(
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
		),
		members: /* @__PURE__ */ optional(intersectionkmdrl70pxuocbAllows),
		errors: /* @__PURE__ */ optional(
			/* @__PURE__ */ units(["all", "first", "none"])
		),
		mutatesInput: /* @__PURE__ */ optional(
			/* @__PURE__ */ units(["always", false, true])
		),
		optimize: /* @__PURE__ */ optional(
			/* @__PURE__ */ units(["size", "speed"])
		),
		optimizeErrors: /* @__PURE__ */ optional(
			/* @__PURE__ */ units(["size", "speed"])
		),
		jsonInput: /* @__PURE__ */ optional(booleanChecker),
		bakedLimit: /* @__PURE__ */ optional(
			/* @__PURE__ */ intersection(
				/* @__PURE__ */ check(
					"domain",
					"the characters a site's baked introspection may total",
					numberCheck.test
				),
				[
					/* @__PURE__ */ divisor(
						1,
						"the characters a site's baked introspection may total"
					),
					/* @__PURE__ */ min(
						0,
						1,
						"the characters a site's baked introspection may total"
					)
				]
			)
		),
		freeze: /* @__PURE__ */ optional(booleanChecker),
		lazy: /* @__PURE__ */ optional(booleanChecker),
		creationChecks: /* @__PURE__ */ optional(
			/* @__PURE__ */ units(["helpers", "none", "types"])
		),
		shadow: /* @__PURE__ */ optional(booleanChecker),
		prune: /* @__PURE__ */ optional(booleanChecker),
		allowUnsafe: /* @__PURE__ */ optional(booleanChecker),
		conditions: /* @__PURE__ */ optional(
			/* @__PURE__ */ intersection(
				arrayCheck,
				[],
				/* @__PURE__ */ elementsOf(stringCheck)
			)
		),
		tsconfig: /* @__PURE__ */ optional(
			/* @__PURE__ */ intersection(
				/* @__PURE__ */ check("domain", "a path", stringCheck.test),
				[/* @__PURE__ */ minLength(1, "a path")]
			)
		),
		dependencies: /* @__PURE__ */ optional(intersection1pta4mn06i3i5bAllows)
	})
	return [intersectionwzvg801kidwckAllows]
})(intersectionkmdrl70pxuocb, intersection1pta4mn06i3i5b)
var intersection1azzur91ptz9ds = /* @__PURE__ */ (([
	intersectionwzvg801kidwckAllows
]) => {
	const intersection1azzur91ptz9dsAllows = /* @__PURE__ */ closedProps({
		$schema: /* @__PURE__ */ optional(stringCheck),
		precompile: /* @__PURE__ */ optional(intersectionwzvg801kidwckAllows)
	})
	return [intersection1azzur91ptz9dsAllows]
})(intersectionwzvg801kidwck)
var intersection1sib0cb02x4j03 = /* @__PURE__ */ (([
	intersectionwzvg801kidwckAllows
]) => {
	const intersection1sib0cb02x4j03Allows = /* @__PURE__ */ closedProps({
		precompile: /* @__PURE__ */ optional(intersectionwzvg801kidwckAllows),
		aot: /* @__PURE__ */ optional(/* @__PURE__ */ unit(true))
	})
	return [intersection1sib0cb02x4j03Allows]
})(intersectionwzvg801kidwck)
var created0
var created1
var created2
var get0 = () => {
	return created0 === void 0 ?
			(created0 = (() => {
				const validator0 = interned("deydnu1k3joey", () =>
					create12fpvlf14u2zct(intersection1e1eu9q0xorpuh, "1memd7b1")
				)
				return validator0
			})())
		:	created0
}
var get1 = () => {
	return created1 === void 0 ?
			(created1 = (() => {
				const validator0 = interned("1yf5ycr149q7ho", () =>
					create12fpvlf14u2zct(intersection1azzur91ptz9ds, "1cl1eak0")
				)
				return validator0
			})())
		:	created1
}
var get2 = () => {
	return created2 === void 0 ?
			(created2 = (() => {
				const validator0 = interned("12k1he90m20tls", () =>
					create12fpvlf14u2zct(intersection1sib0cb02x4j03, "1i9mlhj1")
				)
				return validator0
			})())
		:	created2
}
export { get1 as ArkJson, get2 as PackageArk, get0 as PrecompileOptions }

export const cliOptions = {
	allowUnsafe: { type: "boolean", values: "true|false" },
	bakedLimit: { type: "string", values: "path" },
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
