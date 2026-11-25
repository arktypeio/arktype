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

// ark/util/objectKinds.ts
var isArray = /* @__PURE__ */ (() => Array.isArray)()

// ark/schema/shared/issueFeatures.ts
var reportsIndices = true
var bracketsKeys = true
var writesText = true
var callsSiteText = true
var listsUnions = true
var appliesValues = true
var transformsBranches = true
var failsInBranches = true
var labelsValues = true
var readsSummary = true
var readsErrors = true
var namesTraversalError = true
var findsOnRead = false

// ark/schema/shared/issues.ts
var refuseLocale = locale => {
	if (locale === void 0) return
	if (typeof locale !== "object" || locale === null || Array.isArray(locale))
		throw Error("Expected a Locale object")
	throw Error('import "arktype/i18n" to write errors in locales other than en')
}
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
		return serializableIssues(this._)
	}
	/**
	 * @internal fails data at the path it's at. Every bundle holds this, so it
	 * takes neither a key nor a site: a validator whose code fails nothing at
	 * a key would hold what enters one for nothing, which failsKey does
	 * through _k, and a site is a function building it in every bundle
	 */
	_e(data, code, expected, message, text) {
		this._.push({ code, path: this._p.slice(), data, expected, message })
		if (callsSiteText) text?.(this._[this._.length - 1])
		return void 0
	}
	/** @internal */
	_k(apply, data, key, ...missing) {
		this._p.push(key)
		const stops =
			missing.length && !(key in data) ?
				this._e(data, "required", ...missing)
			:	!apply(data[key], this)
		this._p.pop()
		return stops
	}
}
var UnreadIssues = class {
	constructor(data, config, apply) {
		this._p = []
		this._a = apply
		this._d = data
	}
	/** @internal each issue in the order it was added, found when first read */
	get _() {
		if (!this._f) {
			this._f = []
			if (this._a && (this._a(this._d, this), !this._f.length))
				this._e(this._d, "predicate", "valid", "is invalid")
		}
		return this._f
	}
	get count() {
		return this._.length
	}
	get issues() {
		return serializableIssues(this._)
	}
	_e(data, code, expected, message, text) {
		this._.push({ code, path: this._p.slice(), data, expected, message })
		if (callsSiteText) text?.(this._[this._.length - 1])
		return void 0
	}
	_k(apply, data, key, ...missing) {
		this._p.push(key)
		const stops =
			missing.length && !(key in data) ?
				this._e(data, "required", ...missing)
			:	!apply(data[key], this)
		this._p.pop()
		return stops
	}
}
var failsSite = (ctx, context, data) =>
	ctx._e(data, context.code, context.description, context.x, context.text)
var failsKeySite = (ctx, site, data, key) =>
	ctx._k(
		(value, ctx2) => !failsSite(ctx2, site.v ?? site, value),
		data,
		key,
		...missingTextOf(site.m)
	)
var missingTextOf = missing =>
	missing ? [missing.description, missing.x, missing.text] : []
var Issues =
	readsErrors ?
		findsOnRead ?
			// named apart, as one bundle may hold both and a name is one class's
			class UnreadArkIssues {
				constructor(data, config, apply) {
					this._p = []
					this._a = apply
					this._d = data
				}
				get _() {
					if (!this._f) {
						this._f = []
						if (this._a && (this._a(this._d, this), !this._f.length))
							this._e(this._d, "predicate", "valid", "is invalid")
					}
					return this._f
				}
				get count() {
					return this._.length
				}
				get issues() {
					return serializableIssues(this._)
				}
				_e(data, code, expected, message, text) {
					this._.push({ code, path: this._p.slice(), data, expected, message })
					if (callsSiteText) text?.(this._[this._.length - 1])
					return void 0
				}
				_k(apply, data, key, ...missing) {
					this._p.push(key)
					const stops =
						missing.length && !(key in data) ?
							this._e(data, "required", ...missing)
						:	!apply(data[key], this)
					this._p.pop()
					return stops
				}
				get summary() {
					let summary = ""
					for (const issue of this._)
						summary += (summary && "\n") + lineOf(issue)
					return summary
				}
				summaryIn(locale) {
					refuseLocale(locale)
					return this.summary
				}
				throw() {
					if (namesTraversalError) throw new ThrownIssues(this)
					if (definedThrown) throw new definedThrown(this)
					const thrown = Error(this.summary)
					thrown.name = "TraversalError"
					throw Object.defineProperty(thrown, "arkErrors", { value: this })
				}
				toJSON() {
					return this.issues.map(jsonIssueOf)
				}
				[Symbol.iterator]() {
					return this.issues[Symbol.iterator]()
				}
				toString() {
					return this.summary
				}
			}
		:	class ArkIssues {
				constructor() {
					this._ = []
					this._p = []
				}
				get count() {
					return this._.length
				}
				get issues() {
					return serializableIssues(this._)
				}
				_e(data, code, expected, message, text) {
					this._.push({ code, path: this._p.slice(), data, expected, message })
					if (callsSiteText) text?.(this._[this._.length - 1])
					return void 0
				}
				_k(apply, data, key, ...missing) {
					this._p.push(key)
					const stops =
						missing.length && !(key in data) ?
							this._e(data, "required", ...missing)
						:	!apply(data[key], this)
					this._p.pop()
					return stops
				}
				get summary() {
					let summary = ""
					for (const issue of this._)
						summary += (summary && "\n") + lineOf(issue)
					return summary
				}
				summaryIn(locale) {
					refuseLocale(locale)
					return this.summary
				}
				// constructed by TraversalError wherever its bundle keeps the
				// class: otherwise an Error with the same name, message and
				// errors, and no class in its bundle. Its name is assigned and
				// its errors defined as the class's are, in statements, which
				// gzip to less than one expression building it and which a build
				// writing the flag as a literal folds as well
				throw() {
					if (namesTraversalError) throw new ThrownIssues(this)
					if (definedThrown) throw new definedThrown(this)
					const thrown = Error(this.summary)
					thrown.name = "TraversalError"
					throw Object.defineProperty(thrown, "arkErrors", { value: this })
				}
				toJSON() {
					return this.issues.map(jsonIssueOf)
				}
				[Symbol.iterator]() {
					return this.issues[Symbol.iterator]()
				}
				toString() {
					return this.summary
				}
			}
	: readsSummary ?
		class extends (findsOnRead ? UnreadIssues : ReadIssues) {
			get summary() {
				let summary = ""
				for (const issue of this._) summary += (summary && "\n") + lineOf(issue)
				return summary
			}
		}
	: findsOnRead ? UnreadIssues
	: ReadIssues
var jsonIssueOf = issue => ({
	code: issue.code,
	path: issue.path.map(k => (typeof k === "symbol" ? String(k) : k)),
	...(issue.expected !== void 0 && { expected: issue.expected }),
	message: issue.message ?? messageOf(issue),
	...(issue.errors?.length ? { errors: issue.errors.map(jsonIssueOf) } : {})
})
var issuesToJson = {
	value() {
		return this.map(jsonIssueOf)
	},
	writable: true,
	configurable: true
}
var serializableIssues = issues => {
	for (const issue of issues) issue.message ??= messageOf(issue)
	return issues.toJSON ? issues : (
			Object.defineProperty(issues, "toJSON", issuesToJson)
		)
}
var foundErrors = (apply, data, onFail, Ctx = Issues) => {
	const errors = new Ctx()
	apply(data, errors)
	if (!errors._.length) errors._e(data, "predicate", "valid", "is invalid")
	return onFail ? onFail(errors) : errors
}
var mergeIssues = (errors, merged, prefix) => {
	for (const issue of merged.issues) {
		errors._.push(
			listsUnions && issue._m ?
				issue._m(prefix)
			:	movedIssue(issue, [...prefix, ...issue.path])
		)
	}
}
var codedIssue = issue => Object.defineProperty(issue, "_c", { value: 2 })
var notedAs = (issue, copy) =>
	labelsValues && issue._n !== void 0 ? labeledIssue(copy, issue._n)
	: listsUnions && writesText && issue._c ? codedIssue(copy)
	: copy
var movedIssue = (issue, path) =>
	notedAs(issue, {
		code: issue.code,
		path,
		data: issue.data,
		expected: issue.expected,
		message: issue.message
	})
var pathOf = issue => {
	let path = ""
	for (const k of issue.path) {
		path +=
			reportsIndices && typeof k === "number" ? `[${k}]`
			: bracketsKeys && !/^[$_a-z][\w$]*$/i.test(String(k)) ?
				`[${JSON.stringify(k) ?? String(k)}]`
			:	(path && ".") + String(k)
	}
	return path
}
var lineOf = issue => {
	const message = (issue.message ??= messageOf(issue))
	const path =
		reportsIndices || bracketsKeys ? pathOf(issue) : issue.path.join(".")
	return (
		listsUnions && issue._l !== void 0 ? issue._l
		: labelsValues && issue._n !== void 0 ? labeledPathOf(issue) + message
		: path ?
			path +
			((
				writesText &&
				!(message === "is invalid" && issue.expected === "valid") &&
				!message.startsWith(messageOf(issue))
			) ?
				": "
			:	" ") +
			message
		:	message
	)
}
var messageOf = issue =>
	issue.expected !== void 0 ?
		"must be " +
		issue.expected +
		(issue.code === "required" ? " (was missing)" : "")
	: issue.code === "required" ? "is missing"
	: "is invalid"
var definedThrown
var ThrownIssues = /* @__PURE__ */ (() =>
	(definedThrown = class TraversalError extends Error {
		constructor(errors) {
			super(errors.summary)
			this.name = "TraversalError"
			Object.defineProperty(this, "arkErrors", { value: errors })
		}
	}))()
var labeledIssue = (issue, label) =>
	Object.defineProperty(issue, "_n", { value: label, configurable: true })
var labeledPathOf = issue => {
	const { path } = issue
	const prefix = pathOf(
		typeof path[path.length - 1] === "string" ?
			{ path: path.slice(0, -1) }
		:	issue
	)
	return prefix && prefix + ": "
}

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
		return (
				keys.length !== copy.length ||
					keys[copy.length - 1] !== `${copy.length - 1}` ||
					Object.getOwnPropertySymbols(data).length
			) ?
				Object.defineProperties(
					copy,
					Object.getOwnPropertyDescriptors({ ...data })
				)
			:	copy
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
var callContext
var inContext = (context, run) => {
	const outer = callContext
	callContext = context
	try {
		return run()
	} finally {
		callContext = outer
	}
}
var withContextOf = (t, context) => {
	const standard = t["~standard"]
	return Object.assign(data => inContext(context, () => t(data)), {
		assert: data => inContext(context, () => t.assert(data)),
		allows: data => inContext(context, () => t.allows(data)),
		// as the Type's, with its vendor's own members like _c, but validating in context
		"~standard": Object.defineProperties(
			{},
			{
				...Object.getOwnPropertyDescriptors(standard),
				validate: {
					value: (value, options) =>
						inContext(context, () => standard.validate(value, options)),
					enumerable: true
				}
			}
		)
	})
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
var wrapping = (checker, also) =>
	Object.assign((data, ctx) => checker(data, ctx), checker, also)
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
var listed = printed => {
	const last = printed.pop()
	return printed.length ? `${printed.join(", ")} or ${last}` : last
}
var describeValues = values => listed(values.map(printValue))
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
var optional = (checker, ...value) => wrapping(checker, { o: 1, d: value })
var failsValue = (ctx, checker, data, k, value) =>
	ctx?._e ?
		appliesValues && checker.e ? checker.e(ctx, checker, value, k)
		: appliesValues && checker.t?.e ? checker.t.e(ctx, checker, value, k)
		: (!checker.t ||
				!(appliesValues && checker.a ?
					// as arktype, a value reading its ctx is applied once where
					// one only checks, as Allows does
					!ctx.chkOnly && checker.a(value, ctx, k)
				:	checker(value))) &&
			ctx._k(checker, data, k)
	:	!checker(value)
var props = declared => {
	const checker = (data, ctx) => {
		if (!objectCheck.test(data)) return !failsAt(ctx, objectCheck, data)
		for (const k in declared) {
			const value = data[k]
			if (
				value === void 0 && !(k in data) ?
					// entered by the ctx, which fails a key missing from data as
					// required with what it's passed: what its checker holds for
					// it, the description it expects, the message it says and
					// what notes one that's its code's
					!declared[k].o &&
					(!ctx?._e ||
						ctx._k(
							declared[k],
							data,
							k,
							declared[k].description,
							declared[k].x,
							declared[k].text
						))
				:	failsValue(ctx, declared[k], data, k, value)
			)
				return false
		}
		return true
	}
	checker.description = objectCheck.description
	return checker
}
var closedProps = (declared, description = "removed") => {
	const removed = siteOf("undeclared", description)
	const walks = props(declared)
	const checker = (data, ctx) => {
		if (!objectCheck.test(data)) return !failsAt(ctx, objectCheck, data)
		if (!walks(data, ctx)) return false
		for (const k in data) {
			if (
				!hasOwn(declared, k) &&
				hasOwn(data, k) &&
				failsAtKey(ctx, removed, data, k)
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
var writtenProps = (declared, changing, data) => {
	let out = data
	for (const k in changing) {
		const holds = k in data
		const defaulted = changing[k].d
		const value = holds ? changing[k].t?.(data[k]) : defaulted?.[0]
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
var changingIn = declared => {
	const changing = {}
	for (const k in declared) {
		const { t, d, w } = declared[k]
		if (t || w || d?.length) changing[k] = declared[k]
	}
	return changing
}
var writtenValues = (declared, changing, data, values) => {
	let out = data
	let defaults = false
	for (const k in changing) {
		const checker = changing[k]
		if (!holdsValue(checker, data, k)) {
			defaults ||= isDefaulted(checker)
			continue
		}
		if (!checker.t) continue
		const value = values.transformed(checker.t, data[k], k)
		if (Object.is(value, data[k])) continue
		if (out === data) out = copyOf(data)
		out[k] = value
	}
	if (defaults && !values.failed()) {
		for (const k in changing) {
			const checker = changing[k]
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
var sitedKeeps = (declared, checkers, write) => (data, values) => {
	const out = write(data, checkers, values, copyOf)
	if (out !== data) {
		for (const k in declared) if (!(k in out) && k in data) out[k] = data[k]
	}
	return out
}
var sitedProps = (allows, declared, write, walks = props(declared)) => {
	const checkers = Object.values(declared)
	const checker = (data, ctx) =>
		!objectCheck.test(data) ? !failsAt(ctx, objectCheck, data)
		: ctx?._e ? walks(data, ctx)
		: allows(data, checkers)
	checker.description = objectCheck.description
	if (write) {
		const written = sitedKeeps(declared, checkers, write)
		checker.t = data => written(data)
	}
	return checker
}
var sited = (allows, declared, write, writes, removed, withCtx) => {
	const checker = sitedProps(
		allows,
		declared,
		0,
		removed ? closedProps(declared, removed) : void 0
	)
	if (!write) return checker
	const checkers = Object.values(declared)
	const changing = changingIn(declared)
	const keeps = sitedKeeps(declared, checkers, write)
	const written = (data, values) =>
		writes < 3 ? keeps(data, values)
		: Object.getPrototypeOf(data) === Object.prototype ?
			write(data, checkers, values, copyOf)
		:	deletes(
				declared,
				data,
				values ?
					writtenValues(declared, changing, data, values)
				:	writtenProps(declared, changing, data)
			)
	checker.t =
		writes % 2 ?
			data => written(data)
		:	readingValues(
				(data, ctx) => {
					const values = writtenFor(ctx)
					try {
						return values.resolved(data, written(data, values))
					} finally {
						freed(values)
					}
				},
				checkers,
				withCtx
			)
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
	// what a t returns of out where a value failed: with no ctx, what failed
	resolved(data, out) {
		return this.gathered ?? (this.ctx?.errN > this.issues ? data : out)
	}
	transformed(t, value, k) {
		let result
		if (t.c) {
			this.ctx.path.push(k)
			result = t(value, this.ctx)
			this.ctx.path.pop()
		} else result = t(value)
		if (result === value || !(result instanceof TransformErrors)) return result
		this.gather(result, k)
		return value
	}
	defaulted(write, out) {
		const written = write(out, this.ctx)
		if (written !== out) this.gather(written)
	}
}
var writtenAtDepth = []
var depth = 0
var writtenFor = ctx => {
	if (ctx) return new Written(ctx)
	const values = (writtenAtDepth[depth] ??= new Written())
	depth++
	return values
}
var freed = values => {
	if (values.ctx) return
	depth--
	values.gathered = void 0
}
var readingValues = (t, held, withCtx) => {
	if (withCtx || held.some(({ w }) => w?.length === 2)) t.c = 1
	return holdingMorphs(t, held)
}
var units = (
	values,
	code = "discriminant",
	description = describeValues(values)
) => check(code, description, data => values.includes(data))
var describeDomains = cases =>
	listed(
		Object.keys(cases).map(domain => {
			const branch = cases[domain]
			return (
				branch !== 1 ? `${branch.description}`
				: domain === "undefined" || domain === "null" ? domain
				: `${domain === "object" ? "an" : "a"} ${domain}`
			)
		})
	)
var domains = (cases, description = describeDomains(cases), fails) => {
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
var failsAt = (ctx, site, data) => !ctx?._e || failsSite(ctx, site, data)
var failsAtKey = (ctx, site, data, key) =>
	!ctx?._e || failsKeySite(ctx, site, data, key)
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
var intersectionj0sv370oqte88 = [
	/* @__PURE__ */ sited(
		(data, checkers) => {
			if (
				("assert" in data && !booleanChecker(data.assert)) ||
				("meta" in data && !booleanChecker(data.meta)) ||
				("~standard" in data && !booleanChecker(data["~standard"])) ||
				("methods" in data && !booleanChecker(data.methods)) ||
				("withContext" in data && !booleanChecker(data.withContext)) ||
				("expression" in data && !booleanChecker(data.expression)) ||
				("description" in data && !booleanChecker(data.description)) ||
				("json" in data && !booleanChecker(data.json)) ||
				("toJSON" in data && !booleanChecker(data.toJSON)) ||
				("toJsonSchema" in data && !booleanChecker(data.toJsonSchema)) ||
				("~standard.jsonSchema" in data &&
					!booleanChecker(data["~standard.jsonSchema"]))
			)
				return false
			for (const k in data)
				switch (k) {
					case "assert":
					case "meta":
					case "~standard":
					case "methods":
					case "withContext":
					case "expression":
					case "description":
					case "json":
					case "toJSON":
					case "toJsonSchema":
					case "~standard.jsonSchema":
						break
					default:
						if (Object.prototype.hasOwnProperty.call(data, k)) return false
				}
			return true
		},
		{
			assert: /* @__PURE__ */ optional(booleanChecker),
			meta: /* @__PURE__ */ optional(booleanChecker),
			"~standard": /* @__PURE__ */ optional(booleanChecker),
			methods: /* @__PURE__ */ optional(booleanChecker),
			withContext: /* @__PURE__ */ optional(booleanChecker),
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
var intersectiona1747b08zjj0x = /* @__PURE__ */ (([
	intersectionj0sv370oqte88Allows
]) => {
	const intersectiona1747b08zjj0xAllows = /* @__PURE__ */ sited(
		(data, checkers) => {
			if (
				("preset" in data && !checkers[0](data.preset)) ||
				("runtime" in data && !checkers[1](data.runtime)) ||
				("config" in data && !checkers[2](data.config)) ||
				("members" in data && !checkers[3](data.members)) ||
				("errors" in data && !checkers[4](data.errors)) ||
				("mutatesInput" in data && !checkers[5](data.mutatesInput)) ||
				("optimize" in data && !checkers[6](data.optimize)) ||
				("optimizeErrors" in data && !checkers[6](data.optimizeErrors)) ||
				("strategies" in data && !checkers[8](data.strategies)) ||
				("schemas" in data && !checkers[9](data.schemas)) ||
				("jsonInput" in data && !booleanChecker(data.jsonInput)) ||
				("bakedLimit" in data && !checkers[11](data.bakedLimit)) ||
				("freeze" in data && !booleanChecker(data.freeze)) ||
				("lazy" in data && !booleanChecker(data.lazy)) ||
				("creationChecks" in data && !checkers[14](data.creationChecks)) ||
				("shadow" in data && !booleanChecker(data.shadow)) ||
				("prune" in data && !booleanChecker(data.prune)) ||
				("allowUnsafe" in data && !booleanChecker(data.allowUnsafe)) ||
				("conditions" in data && !checkers[18](data.conditions)) ||
				("tsconfig" in data && !checkers[19](data.tsconfig)) ||
				("checker" in data && !checkers[20](data.checker)) ||
				("dependencies" in data && !checkers[21](data.dependencies)) ||
				("cwd" in data && !checkers[19](data.cwd)) ||
				("inline" in data && !booleanChecker(data.inline)) ||
				("declare" in data && !booleanChecker(data.declare)) ||
				("defers" in data && !checkers[25](data.defers))
			)
				return false
			for (const k in data)
				switch (k) {
					case "preset":
					case "runtime":
					case "config":
					case "members":
					case "errors":
					case "mutatesInput":
					case "optimize":
					case "optimizeErrors":
					case "strategies":
					case "schemas":
					case "jsonInput":
					case "bakedLimit":
					case "freeze":
					case "lazy":
					case "creationChecks":
					case "shadow":
					case "prune":
					case "allowUnsafe":
					case "conditions":
					case "tsconfig":
					case "checker":
					case "dependencies":
					case "cwd":
					case "inline":
					case "declare":
					case "defers":
						break
					default:
						if (Object.prototype.hasOwnProperty.call(data, k)) return false
				}
			return true
		},
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
			members: /* @__PURE__ */ optional(intersectionj0sv370oqte88Allows),
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
			strategies: /* @__PURE__ */ optional(
				/* @__PURE__ */ recordOf(
					/* @__PURE__ */ closedProps({
						optimize: /* @__PURE__ */ optional(
							/* @__PURE__ */ units(["size", "speed"])
						)
					})
				)
			),
			schemas: /* @__PURE__ */ optional(
				/* @__PURE__ */ recordOf(
					/* @__PURE__ */ intersection(stringCheck, [
						/* @__PURE__ */ minLength(1)
					])
				)
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
			checker: /* @__PURE__ */ optional(
				/* @__PURE__ */ units(["tsgo", "tsjs", "tsrs"])
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
	return [intersectiona1747b08zjj0xAllows]
})(intersectionj0sv370oqte88)
var create1q5hta0h0lh5t = ([allows], id, holes = []) => {
	const validator = (data, pipedFromCtx, onFail) =>
		allows(data) ?
			(allows.t?.(data) ?? data)
		:	foundErrors(
				allows,
				data,
				pipedFromCtx ? errors => pipedFromCtx.piped(errors) : onFail
			)
	validator.allows = freeze(allows)
	validator.withContext = freeze(context => withContextOf(validator, context))
	return holdHoles(freeze(validator), id, holes)
}
var intersection1kiu37t1iquj2h = /* @__PURE__ */ (([
	intersectionj0sv370oqte88Allows
]) => {
	const intersection1kiu37t1iquj2hAllows = /* @__PURE__ */ sited(
		(data, checkers) => {
			if (
				("preset" in data && !checkers[0](data.preset)) ||
				("runtime" in data && !checkers[1](data.runtime)) ||
				("config" in data && !checkers[2](data.config)) ||
				("members" in data && !checkers[3](data.members)) ||
				("errors" in data && !checkers[4](data.errors)) ||
				("mutatesInput" in data && !checkers[5](data.mutatesInput)) ||
				("optimize" in data && !checkers[6](data.optimize)) ||
				("optimizeErrors" in data && !checkers[6](data.optimizeErrors)) ||
				("strategies" in data && !checkers[8](data.strategies)) ||
				("schemas" in data && !checkers[9](data.schemas)) ||
				("jsonInput" in data && !booleanChecker(data.jsonInput)) ||
				("bakedLimit" in data && !checkers[11](data.bakedLimit)) ||
				("freeze" in data && !booleanChecker(data.freeze)) ||
				("lazy" in data && !booleanChecker(data.lazy)) ||
				("creationChecks" in data && !checkers[14](data.creationChecks)) ||
				("shadow" in data && !booleanChecker(data.shadow)) ||
				("prune" in data && !booleanChecker(data.prune)) ||
				("allowUnsafe" in data && !booleanChecker(data.allowUnsafe)) ||
				("conditions" in data && !checkers[18](data.conditions)) ||
				("tsconfig" in data && !checkers[19](data.tsconfig)) ||
				("checker" in data && !checkers[20](data.checker)) ||
				("dependencies" in data && !checkers[21](data.dependencies))
			)
				return false
			for (const k in data)
				switch (k) {
					case "preset":
					case "runtime":
					case "config":
					case "members":
					case "errors":
					case "mutatesInput":
					case "optimize":
					case "optimizeErrors":
					case "strategies":
					case "schemas":
					case "jsonInput":
					case "bakedLimit":
					case "freeze":
					case "lazy":
					case "creationChecks":
					case "shadow":
					case "prune":
					case "allowUnsafe":
					case "conditions":
					case "tsconfig":
					case "checker":
					case "dependencies":
						break
					default:
						if (Object.prototype.hasOwnProperty.call(data, k)) return false
				}
			return true
		},
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
			members: /* @__PURE__ */ optional(intersectionj0sv370oqte88Allows),
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
			strategies: /* @__PURE__ */ optional(
				/* @__PURE__ */ recordOf(
					/* @__PURE__ */ closedProps({
						optimize: /* @__PURE__ */ optional(
							/* @__PURE__ */ units(["size", "speed"])
						)
					})
				)
			),
			schemas: /* @__PURE__ */ optional(
				/* @__PURE__ */ recordOf(
					/* @__PURE__ */ intersection(stringCheck, [
						/* @__PURE__ */ minLength(1)
					])
				)
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
			checker: /* @__PURE__ */ optional(
				/* @__PURE__ */ units(["tsgo", "tsjs", "tsrs"])
			),
			dependencies: /* @__PURE__ */ optional(
				/* @__PURE__ */ recordOf(/* @__PURE__ */ units(["aot", "arktype"]))
			)
		},
		0,
		0,
		"removed"
	)
	return [intersection1kiu37t1iquj2hAllows]
})(intersectionj0sv370oqte88)
var intersection84g0ee1bxihyt = /* @__PURE__ */ (([
	intersection1kiu37t1iquj2hAllows
]) => {
	const intersection84g0ee1bxihytAllows = /* @__PURE__ */ closedProps({
		$schema: /* @__PURE__ */ optional(stringCheck),
		precompile: /* @__PURE__ */ optional(intersection1kiu37t1iquj2hAllows)
	})
	return [intersection84g0ee1bxihytAllows]
})(intersection1kiu37t1iquj2h)
var intersection1j4pd4n1jwocfa = /* @__PURE__ */ (([
	intersection1kiu37t1iquj2hAllows
]) => {
	const intersection1j4pd4n1jwocfaAllows = /* @__PURE__ */ closedProps({
		precompile: /* @__PURE__ */ optional(intersection1kiu37t1iquj2hAllows),
		aot: /* @__PURE__ */ optional(/* @__PURE__ */ unit(true))
	})
	return [intersection1j4pd4n1jwocfaAllows]
})(intersection1kiu37t1iquj2h)
var created0
var created1
var created2
var get0 = () => {
	return created0 === void 0 ?
			(created0 = (() => {
				const validator0 = interned("1vfc2j508amzo4", () =>
					create1q5hta0h0lh5t(intersectiona1747b08zjj0x, "1706xit1")
				)
				return validator0
			})())
		:	created0
}
var get1 = () => {
	return created1 === void 0 ?
			(created1 = (() => {
				const validator0 = interned("inq2he0srsmw8", () =>
					create1q5hta0h0lh5t(intersection84g0ee1bxihyt, "1y1ytoj0")
				)
				return validator0
			})())
		:	created1
}
var get2 = () => {
	return created2 === void 0 ?
			(created2 = (() => {
				const validator0 = interned("73gcco1k0mhoe", () =>
					create1q5hta0h0lh5t(intersection1j4pd4n1jwocfa, "12jiwy81")
				)
				return validator0
			})())
		:	created2
}
export { get1 as ArkJson, get2 as PackageArk, get0 as PrecompileOptions }

export const cliOptions = {
	allowUnsafe: { type: "boolean", values: "true|false" },
	bakedLimit: { type: "number", values: "number" },
	checker: { type: "string", values: "tsgo|tsjs|tsrs" },
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
	schemas: { type: "object", values: "json" },
	shadow: { type: "boolean", values: "true|false" },
	strategies: { type: "object", values: "json" },
	tsconfig: { type: "string", values: "path" }
}

// what ark.json's precompile takes, as the ESLint rule's options
export const precompileJsonSchema = {
	type: "object",
	properties: {
		allowUnsafe: { type: "boolean" },
		bakedLimit: {
			type: "integer",
			description: "the characters a site's baked introspection may total",
			exclusiveMinimum: 0
		},
		checker: { type: "string", enum: ["tsgo", "tsjs", "tsrs"] },
		conditions: { type: "array", items: { type: "string" } },
		config: {
			anyOf: [
				{ type: "string", minLength: 1 },
				{ type: "boolean", const: false }
			],
			description: "a module path or false"
		},
		creationChecks: { type: "string", enum: ["helpers", "none", "types"] },
		dependencies: {
			type: "object",
			additionalProperties: { type: "string", enum: ["aot", "arktype"] }
		},
		errors: { type: "string", enum: ["all", "first", "none"] },
		freeze: { type: "boolean" },
		jsonInput: { type: "boolean" },
		lazy: { type: "boolean" },
		members: {
			type: "object",
			properties: {
				assert: { type: "boolean" },
				description: { type: "boolean" },
				expression: { type: "boolean" },
				json: { type: "boolean" },
				meta: { type: "boolean" },
				methods: { type: "boolean" },
				toJSON: { type: "boolean" },
				toJsonSchema: { type: "boolean" },
				withContext: { type: "boolean" },
				"~standard": { type: "boolean" },
				"~standard.jsonSchema": { type: "boolean" }
			},
			additionalProperties: false
		},
		mutatesInput: {
			anyOf: [{ type: "string", const: "always" }, { type: "boolean" }]
		},
		optimize: { type: "string", enum: ["size", "speed"] },
		optimizeErrors: { type: "string", enum: ["size", "speed"] },
		preset: { type: "string", enum: ["introspectable", "smallest"] },
		prune: { type: "boolean" },
		runtime: { type: "string", const: "arktype" },
		schemas: {
			type: "object",
			additionalProperties: { type: "string", minLength: 1 }
		},
		shadow: { type: "boolean" },
		strategies: {
			type: "object",
			additionalProperties: {
				type: "object",
				properties: { optimize: { type: "string", enum: ["size", "speed"] } },
				additionalProperties: false
			}
		},
		tsconfig: { type: "string", description: "a path", minLength: 1 }
	},
	additionalProperties: false
}
