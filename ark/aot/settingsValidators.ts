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
var defineValue = (o, k, value) =>
	Object.defineProperty(o, k, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	})

// ark/util/objectKinds.ts
var isArray = /* @__PURE__ */ (() => Array.isArray)()

// ark/schema/shared/issueFeatures.ts
var reportsIndices = true
var bracketsKeys = true
var writesText = true
var listsUnions = true
var readsKeySites = true
var runsArktype = true
var appliesValues = true
var transformsBranches = true
var failsInBranches = true
var readsSummary = true
var readsErrors = true

// ark/schema/shared/issues.ts
var ReadIssues = class {
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
var SummarizedIssues =
	readsSummary ?
		class extends ReadIssues {
			get summary() {
				let summary = ""
				for (const issue of this._)
					summary += (summary && "\n") + (issue.message ??= messageOf(issue))
				return summary
			}
		}
	:	ReadIssues
var Issues =
	readsErrors ?
		class ArkIssues extends SummarizedIssues {
			throw() {
				throw new ThrownIssues(this)
			}
			toJSON() {
				return this.issues
			}
			toString() {
				return this.summary
			}
		}
	:	SummarizedIssues
var foundErrors = (apply, data, onFail, Ctx = Issues) => {
	const errors = new Ctx()
	apply(data, errors)
	if (!errors._.length) errors._at({ code: "predicate" }, data)
	return onFail ? onFail(errors) : errors
}
var mergeIssues = (errors, merged, prefix) => {
	for (const issue of merged.issues) {
		errors._.push(
			listsUnions && issue._m ?
				issue._m(prefix)
			:	{
					code: issue.code,
					path: [...prefix, ...issue.path],
					data: issue.data,
					expected: issue.expected,
					problem: issue.problem,
					message: issue.message === messageOf(issue) ? void 0 : issue.message
				}
		)
	}
}
var messageOf = issue => {
	let path = ""
	for (const k of issue.path) {
		path +=
			reportsIndices && typeof k === "number" ? `[${k}]`
			: bracketsKeys && !/^[$_a-z][\w$]*$/i.test(String(k)) ?
				`[${JSON.stringify(k) ?? String(k)}]`
			:	(path && ".") + String(k)
	}
	return (path && path + " ") + problemOf(issue)
}
var problemOf = issue =>
	(writesText ? issue.problem : void 0) ??
	(issue.expected !== void 0 ? "must be " + issue.expected
	: issue.code === "required" ? "is missing"
	: "is invalid")
var ThrownIssues =
	readsErrors ?
		class TraversalError extends Error {
			constructor(errors) {
				super((runsArktype ? errors._t : void 0) ?? errors.summary)
				this.name = "TraversalError"
				Object.defineProperty(this, "arkErrors", { value: errors })
			}
		}
	:	void 0

// ark/schema/shared/transform.ts
var TransformErrors = class _TransformErrors {
	// a function, so a check can rule out other values by typeof
	constructor(result, data) {
		const errors = Object.setPrototypeOf(() => {}, _TransformErrors.prototype)
		errors.entries = [{ reversedPath: [], result, data }]
		return errors
	}
	addTo(gathered, key) {
		if (key !== void 0)
			for (const entry of this.entries) entry.reversedPath.push(key)
		if (!gathered) return this
		gathered.entries.push(...this.entries)
		return gathered
	}
}
var copyOf = data => {
	if (isArray(data)) {
		const copy = Array.prototype.slice.call(data)
		const keys = Object.keys(data)
		if (
			keys.length !== copy.length ||
			keys[copy.length - 1] !== `${copy.length - 1}`
		) {
			for (const k of keys) {
				const index = +k >>> 0
				if (`${index}` !== k || index >= copy.length)
					defineValue(copy, k, data[k])
			}
		}
		for (const k of Object.getOwnPropertySymbols(data)) {
			if (Object.prototype.propertyIsEnumerable.call(data, k))
				defineValue(copy, k, data[k])
		}
		return copy
	}
	const prototype = Object.getPrototypeOf(data)
	if (prototype === Object.prototype) return { ...data }
	return Object.prototype.toString.call(data) === "[object Object]" ?
			Object.setPrototypeOf({ ...data }, prototype)
		:	data
}

// ark/schema/shared/traversal.ts
var errorsOf = ctx => (ctx._errors ??= ctx.createErrors())
var receive = (ctx, data) => {
	ctx.recv = data
	ctx.recvAt = ctx.path.length
}
var addErrors = (ctx, errors) => {
	if (errors === ctx._errors) return
	const target = errorsOf(ctx)
	if (target._merge) target._merge(errors, ctx.path)
	else mergeIssues(target, errors, ctx.path)
}
var addMorphErrs = (ctx, errors, key) => {
	const { path, recv, recvAt } = ctx
	for (const { reversedPath, result, data } of errors.entries) {
		ctx.path = [...path]
		if (key !== void 0) ctx.path.push(key)
		for (let i = reversedPath.length - 1; i >= 0; i--)
			ctx.path.push(reversedPath[i])
		receive(ctx, data)
		addErrors(ctx, result)
	}
	ctx.path = path
	ctx.recv = recv
	ctx.recvAt = recvAt
}

// ark/type/checkers.ts
var holdingMorphs = (t, held) => {
	for (const checker of held) {
		t.e ??= checker.t?.e
		t.c ??= checker.t?.c
	}
	return t
}
var check = (code, description, test) => {
	const checker = (data, ctx) => test(data) || !failsAt(ctx, checker, data)
	checker.code = code
	checker.description = description
	checker.test = test
	return checker
}
var wrapping = checker =>
	Object.assign((data, ctx) => checker(data, ctx), checker)
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
var moreThan = (
	rule,
	description = rule === 0 ? "positive" : `more than ${rule}`
) => check("min", description, data => data > rule)
var minLength = (
	rule,
	description = rule === 1 ? "non-empty" : `at least length ${rule}`
) => check("minLength", description, data => data.length >= rule)
var divisor = (
	rule,
	description = rule === 2 ? "even" : `a multiple of ${rule}`
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
var intersection = (
	basis,
	refinements,
	within,
	brief = basis ? basis.description : "present"
) => {
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
	checker.description = brief
	checker.t = within?.t
	return checker
}
var optional = (checker, ...value) => {
	const wrapped = wrapping(checker)
	wrapped.o = 1
	wrapped.d = value
	return wrapped
}
var failsValue = (ctx, checker, data, k, value) =>
	ctx?._at ?
		appliesValues && checker.e ? checker.e(ctx, checker, value, k)
		: appliesValues && checker.t?.e ? checker.t.e(ctx, checker, value, k)
		: (!checker.t ||
				!(appliesValues && checker.a ?
					// as arktype, a value reading its ctx is applied once where
					// one only checks, as Allows does
					!ctx.chkOnly && checker.a(value, ctx, k)
				:	checker(value))) &&
			ctx._in(checker, data, k)
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
var props = declared => {
	const checker = (data, ctx) =>
		objectCheck.test(data) ?
			!failsProps(declared, data, ctx)
		:	!failsAt(ctx, objectCheck, data)
	checker.description = objectCheck.description
	return checker
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
var recordOf = value => {
	const checker = (data, ctx) => {
		if (!objectCheck.test(data)) return !failsAt(ctx, objectCheck, data)
		for (const k of Object.keys(data))
			if (failsValue(ctx, value, data, k, data[k])) return false
		return true
	}
	checker.description = objectCheck.description
	return checker
}
var holdsValue = (checker, data, k) =>
	checker.u ? data[k] !== void 0 : k in data
var writtenProps = (declared, data) => {
	let out = data
	for (const k in declared) {
		const holds = k in data
		const defaulted = declared[k].d
		const value = holds ? declared[k].t?.(data[k]) : defaulted?.[0]
		if (holds ? value !== void 0 && value !== data[k] : defaulted?.length) {
			if (out === data) out = copyOf(data)
			out[k] = value
		}
	}
	if (out !== data) {
		for (const k in declared) if (!(k in out) && k in data) out[k] = data[k]
	}
	return out
}
var isDefaulted = ({ d, w }) => !!(w || d?.length)
var writtenValues = (declared, data, values) => {
	let out = data
	let defaults = false
	for (const k in declared) {
		const checker = declared[k]
		if (!holdsValue(checker, data, k)) {
			defaults ||= isDefaulted(checker)
			continue
		}
		if (!checker.t) continue
		const value = values.transformed(checker, data[k], k)
		if (Object.is(value, data[k])) continue
		if (out === data) out = copyOf(data)
		out[k] = value
	}
	if (defaults && !values.failed()) {
		for (const k in declared) {
			const checker = declared[k]
			if (holdsValue(checker, data, k) || !isDefaulted(checker)) continue
			if (out === data) out = copyOf(data)
			if (checker.w) values.defaulted(checker.w, out)
			else out[k] = checker.d[0]
		}
	}
	if (out !== data) {
		for (const k in declared) if (!(k in out) && k in data) out[k] = data[k]
	}
	return out
}
var deletes = (declared, data, out) => {
	for (const k of [
		...Object.keys(data),
		...Object.getOwnPropertySymbols(data)
	]) {
		if (hasOwn(declared, k)) continue
		if (out === data) out = copyOf(data)
		delete out[k]
	}
	return out
}
var sited = (allows, declared, write, writes, removed, withCtx) => {
	const checkers = Object.values(declared)
	const walks = removed ? closedProps(declared, removed) : props(declared)
	const checker = (data, ctx) => {
		if (ctx?._at || !objectCheck.test(data)) return walks(data, ctx)
		if (!allows(data, checkers)) return false
		if (removed) {
			for (const k in data)
				if (!hasOwn(declared, k) && hasOwn(data, k)) return false
		}
		return true
	}
	checker.description = objectCheck.description
	const changing = {}
	for (const k in declared)
		if (declared[k].t || isDefaulted(declared[k])) changing[k] = declared[k]
	const copied = (data, values) => {
		const out =
			values ?
				writtenValues(changing, data, values)
			:	writtenProps(changing, data)
		if (out !== data) {
			for (const k in declared) if (!(k in out) && k in data) out[k] = data[k]
		}
		return out
	}
	const written =
		write ?
			(data, values) => {
				if (Object.getPrototypeOf(data) !== Object.prototype)
					return deletes(declared, data, copied(data, values))
				const defaults = []
				const result = write(
					data,
					checkers,
					values ?
						(checker2, value, k) =>
							checker2.t ? values.transformed(checker2, value, k) : value
					:	({ t }, value) => (t ? t(value) : value),
					defaults
				)
				if (defaults.length && !values.failed())
					for (const i of defaults) values.defaulted(checkers[i].w, result)
				return result
			}
		:	copied
	checker.t =
		writes === 2 ? failingValues(written, checkers, withCtx)
		: writes ? data => written(data)
		: void 0
	return checker
}
var elementsOf = element => (data, ctx) => {
	for (let i = 0; i < data.length; i++)
		if (failsValue(ctx, element, data, i, data[i])) return false
	return true
}
var Written = class {
	constructor(ctx) {
		this.ctx = ctx
		this.issues = ctx?.errN
		this.gathered = void 0
	}
	gather(errors, k) {
		if (this.ctx) addMorphErrs(this.ctx, errors, k)
		else this.gathered = errors.addTo(this.gathered, k)
	}
	failed() {
		return this.gathered ?? this.ctx?.errN > this.issues
	}
	transformed({ t }, value, k) {
		let result
		if (t.c) {
			this.ctx.path.push(k)
			result = t(value, this.ctx)
			this.ctx.path.pop()
		} else result = t(value)
		if (!(result instanceof TransformErrors)) return result
		this.gather(result, k)
		return value
	}
	defaulted(write, out) {
		const written = write(out, this.ctx)
		if (written !== out) this.gather(written)
	}
}
var failingValues = (write, held, withCtx) => {
	const t = (data, ctx) => {
		const values = new Written(ctx)
		const out = write(data, values)
		return values.failed() ? (values.gathered ?? data) : out
	}
	if (withCtx || held.some(({ w }) => w?.length === 2)) t.c = 1
	return holdingMorphs(t, held)
}
var units = (
	values,
	code = "discriminant",
	description = describeValues(values)
) => check(code, description, data => values.includes(data))
var domains = (cases, description, fails) => {
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
	if (transformsBranches && Object.values(cases).some(branch => branch.t)) {
		checker.t =
			failsInBranches && fails ?
				fails(caseOf, Object.values(cases))
			:	data => caseOf(data).t?.(data) ?? data
	}
	return checker
}

// ark/type/runtime.ts
var freeze = /* @__PURE__ */ (() => Object.freeze)()
var siteOf = (code, description, message) => ({ code, description, x: message })
var requiredSiteOf = description => ({
	m: { code: "required", description }
})
var failsAt = (ctx, site, data, key) => !ctx?._at || ctx._at(site, data, key)
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
var intersectionr7fa5i02hq5pc = [
	/* @__PURE__ */ sited(
		(data, checkers) =>
			!(
				("assert" in data && !booleanChecker(data.assert)) ||
				("meta" in data && !booleanChecker(data.meta)) ||
				("~standard" in data && !booleanChecker(data["~standard"])) ||
				("methods" in data && !booleanChecker(data.methods)) ||
				("expression" in data && !booleanChecker(data.expression)) ||
				("description" in data && !booleanChecker(data.description)) ||
				("json" in data && !booleanChecker(data.json)) ||
				("toJSON" in data && !booleanChecker(data.toJSON)) ||
				("toJsonSchema" in data && !booleanChecker(data.toJsonSchema)) ||
				("~standard.jsonSchema" in data &&
					!booleanChecker(data["~standard.jsonSchema"]))
			),
		{
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
		},
		0,
		0,
		"removed"
	)
]
var intersectiong64o0o0ukdr2c = /* @__PURE__ */ (([
	intersectionr7fa5i02hq5pcAllows
]) => {
	const intersectiong64o0o0ukdr2cAllows = /* @__PURE__ */ sited(
		(data, checkers) =>
			!(
				("preset" in data && !checkers[0](data.preset)) ||
				("runtime" in data && !checkers[1](data.runtime)) ||
				("config" in data && !checkers[2](data.config)) ||
				("members" in data && !checkers[3](data.members)) ||
				("errors" in data && !checkers[4](data.errors)) ||
				("mutatesInput" in data && !checkers[5](data.mutatesInput)) ||
				("optimize" in data && !checkers[6](data.optimize)) ||
				("optimizeErrors" in data && !checkers[6](data.optimizeErrors)) ||
				("jsonInput" in data && !booleanChecker(data.jsonInput)) ||
				("bakedLimit" in data && !checkers[9](data.bakedLimit)) ||
				("freeze" in data && !booleanChecker(data.freeze)) ||
				("lazy" in data && !booleanChecker(data.lazy)) ||
				("creationChecks" in data && !checkers[12](data.creationChecks)) ||
				("shadow" in data && !booleanChecker(data.shadow)) ||
				("prune" in data && !booleanChecker(data.prune)) ||
				("allowUnsafe" in data && !booleanChecker(data.allowUnsafe)) ||
				("conditions" in data && !checkers[16](data.conditions)) ||
				("tsconfig" in data && !checkers[17](data.tsconfig)) ||
				("dependencies" in data && !checkers[18](data.dependencies)) ||
				("cwd" in data && !checkers[17](data.cwd)) ||
				("inline" in data && !booleanChecker(data.inline)) ||
				("declare" in data && !booleanChecker(data.declare)) ||
				("defers" in data && !checkers[22](data.defers))
			),
		{
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
							[/* @__PURE__ */ minLength(1, "a module path or false")],
							void 0,
							"a string"
						),
						boolean: /* @__PURE__ */ unit(false, "a module path or false")
					},
					"a module path or false"
				)
			),
			members: /* @__PURE__ */ optional(intersectionr7fa5i02hq5pcAllows),
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
						/* @__PURE__ */ moreThan(
							0,
							"the characters a site's baked introspection may total"
						)
					],
					void 0,
					"a number"
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
					[/* @__PURE__ */ minLength(1, "a path")],
					void 0,
					"a string"
				)
			),
			dependencies: /* @__PURE__ */ optional(
				/* @__PURE__ */ recordOf(/* @__PURE__ */ units(["aot", "arktype"]))
			),
			cwd: /* @__PURE__ */ optional(
				/* @__PURE__ */ intersection(
					/* @__PURE__ */ check("domain", "a path", stringCheck.test),
					[/* @__PURE__ */ minLength(1, "a path")],
					void 0,
					"a string"
				)
			),
			inline: /* @__PURE__ */ optional(booleanChecker),
			declare: /* @__PURE__ */ optional(booleanChecker),
			defers: /* @__PURE__ */ optional(
				/* @__PURE__ */ units(["large", false, true])
			)
		},
		0,
		0,
		"removed"
	)
	return [intersectiong64o0o0ukdr2cAllows]
})(intersectionr7fa5i02hq5pc)
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
var intersection14iv1st1nsrrgj = /* @__PURE__ */ (([
	intersectionr7fa5i02hq5pcAllows
]) => {
	const intersection14iv1st1nsrrgjAllows = /* @__PURE__ */ sited(
		(data, checkers) =>
			!(
				("preset" in data && !checkers[0](data.preset)) ||
				("runtime" in data && !checkers[1](data.runtime)) ||
				("config" in data && !checkers[2](data.config)) ||
				("members" in data && !checkers[3](data.members)) ||
				("errors" in data && !checkers[4](data.errors)) ||
				("mutatesInput" in data && !checkers[5](data.mutatesInput)) ||
				("optimize" in data && !checkers[6](data.optimize)) ||
				("optimizeErrors" in data && !checkers[6](data.optimizeErrors)) ||
				("jsonInput" in data && !booleanChecker(data.jsonInput)) ||
				("bakedLimit" in data && !checkers[9](data.bakedLimit)) ||
				("freeze" in data && !booleanChecker(data.freeze)) ||
				("lazy" in data && !booleanChecker(data.lazy)) ||
				("creationChecks" in data && !checkers[12](data.creationChecks)) ||
				("shadow" in data && !booleanChecker(data.shadow)) ||
				("prune" in data && !booleanChecker(data.prune)) ||
				("allowUnsafe" in data && !booleanChecker(data.allowUnsafe)) ||
				("conditions" in data && !checkers[16](data.conditions)) ||
				("tsconfig" in data && !checkers[17](data.tsconfig)) ||
				("dependencies" in data && !checkers[18](data.dependencies))
			),
		{
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
							[/* @__PURE__ */ minLength(1, "a module path or false")],
							void 0,
							"a string"
						),
						boolean: /* @__PURE__ */ unit(false, "a module path or false")
					},
					"a module path or false"
				)
			),
			members: /* @__PURE__ */ optional(intersectionr7fa5i02hq5pcAllows),
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
						/* @__PURE__ */ moreThan(
							0,
							"the characters a site's baked introspection may total"
						)
					],
					void 0,
					"a number"
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
					[/* @__PURE__ */ minLength(1, "a path")],
					void 0,
					"a string"
				)
			),
			dependencies: /* @__PURE__ */ optional(
				/* @__PURE__ */ recordOf(/* @__PURE__ */ units(["aot", "arktype"]))
			)
		},
		0,
		0,
		"removed"
	)
	return [intersection14iv1st1nsrrgjAllows]
})(intersectionr7fa5i02hq5pc)
var intersection134gw5z1ow29ev = /* @__PURE__ */ (([
	intersection14iv1st1nsrrgjAllows
]) => {
	const intersection134gw5z1ow29evAllows = /* @__PURE__ */ closedProps({
		$schema: /* @__PURE__ */ optional(stringCheck),
		precompile: /* @__PURE__ */ optional(intersection14iv1st1nsrrgjAllows)
	})
	return [intersection134gw5z1ow29evAllows]
})(intersection14iv1st1nsrrgj)
var intersection1pxmr4d0azyt6q = /* @__PURE__ */ (([
	intersection14iv1st1nsrrgjAllows
]) => {
	const intersection1pxmr4d0azyt6qAllows = /* @__PURE__ */ closedProps({
		precompile: /* @__PURE__ */ optional(intersection14iv1st1nsrrgjAllows),
		aot: /* @__PURE__ */ optional(/* @__PURE__ */ unit(true))
	})
	return [intersection1pxmr4d0azyt6qAllows]
})(intersection14iv1st1nsrrgj)
var created0
var created1
var created2
var get0 = () => {
	return created0 === void 0 ?
			(created0 = (() => {
				const validator0 = interned("ba2dyl0hxov64", () =>
					create12fpvlf14u2zct(intersectiong64o0o0ukdr2c, "1xqe4zk0")
				)
				return validator0
			})())
		:	created0
}
var get1 = () => {
	return created1 === void 0 ?
			(created1 = (() => {
				const validator0 = interned("131ktzb1yyv4fo", () =>
					create12fpvlf14u2zct(intersection134gw5z1ow29ev, "1cl1eak0")
				)
				return validator0
			})())
		:	created1
}
var get2 = () => {
	return created2 === void 0 ?
			(created2 = (() => {
				const validator0 = interned("m6ykoq11dwob9", () =>
					create12fpvlf14u2zct(intersection1pxmr4d0azyt6q, "1i9mlhj1")
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
	defers: { type: "string", values: "large|true|false" },
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
