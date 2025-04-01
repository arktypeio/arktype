;(function () {
	// ../util/out/arrays.js
	var liftArray = data => (Array.isArray(data) ? data : [data])
	var spliterate = (arr, predicate) => {
		const result = [[], []]
		for (const item of arr) {
			if (predicate(item)) result[0].push(item)
			else result[1].push(item)
		}
		return result
	}
	var ReadonlyArray = Array
	var includes = (array, element) => array.includes(element)
	var range = (length, offset = 0) =>
		[...new Array(length)].map((_, i) => i + offset)
	var append = (to, value2, opts) => {
		if (to === void 0) {
			return (
				value2 === void 0 ? []
				: Array.isArray(value2) ? value2
				: [value2]
			)
		}
		if (opts?.prepend) {
			if (Array.isArray(value2)) to.unshift(...value2)
			else to.unshift(value2)
		} else {
			if (Array.isArray(value2)) to.push(...value2)
			else to.push(value2)
		}
		return to
	}
	var conflatenate = (to, elementOrList) => {
		if (elementOrList === void 0 || elementOrList === null) return to ?? []
		if (to === void 0 || to === null) return liftArray(elementOrList)
		return to.concat(elementOrList)
	}
	var conflatenateAll = (...elementsOrLists) =>
		elementsOrLists.reduce(conflatenate, [])
	var appendUnique = (to, value2, opts) => {
		if (to === void 0) return Array.isArray(value2) ? value2 : [value2]
		const isEqual = opts?.isEqual ?? ((l, r) => l === r)
		liftArray(value2).forEach(v => {
			if (!to.some(existing => isEqual(existing, v))) to.push(v)
		})
		return to
	}
	var groupBy = (array, discriminant) =>
		array.reduce((result, item) => {
			const key = item[discriminant]
			result[key] = append(result[key], item)
			return result
		}, {})
	var arrayEquals = (l, r, opts) =>
		l.length === r.length &&
		l.every(
			opts?.isEqual ?
				(lItem, i) => opts.isEqual(lItem, r[i])
			:	(lItem, i) => lItem === r[i]
		)

	// ../util/out/domain.js
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
	var domainDescriptions = {
		boolean: "boolean",
		null: "null",
		undefined: "undefined",
		bigint: "a bigint",
		number: "a number",
		object: "an object",
		string: "a string",
		symbol: "a symbol"
	}
	var jsTypeOfDescriptions = {
		...domainDescriptions,
		function: "a function"
	}

	// ../util/out/errors.js
	var InternalArktypeError = class extends Error {}
	var throwInternalError = message => throwError(message, InternalArktypeError)
	var throwError = (message, ctor = Error) => {
		throw new ctor(message)
	}
	var ParseError = class extends Error {
		name = "ParseError"
	}
	var throwParseError = message => throwError(message, ParseError)
	var noSuggest = s => ` ${s}`

	// ../util/out/flatMorph.js
	var flatMorph = (o, flatMapEntry) => {
		const result = {}
		const inputIsArray = Array.isArray(o)
		let outputShouldBeArray = false
		Object.entries(o).forEach((entry, i) => {
			const mapped =
				inputIsArray ? flatMapEntry(i, entry[1]) : flatMapEntry(...entry, i)
			outputShouldBeArray ||= typeof mapped[0] === "number"
			const flattenedEntries =
				Array.isArray(mapped[0]) || mapped.length === 0 ?
					// if we have an empty array (for filtering) or an array with
					// another array as its first element, treat it as a list
					mapped
				:	[mapped]
			flattenedEntries.forEach(([k, v]) => {
				if (typeof k === "object") result[k.group] = append(result[k.group], v)
				else result[k] = v
			})
		})
		return outputShouldBeArray ? Object.values(result) : result
	}

	// ../util/out/records.js
	var entriesOf = Object.entries
	var isKeyOf = (k, o) => k in o
	var hasKey = (o, k) => k in o
	var DynamicBase = class {
		constructor(properties) {
			Object.assign(this, properties)
		}
	}
	var NoopBase = class {}
	var CastableBase = class extends NoopBase {}
	var splitByKeys = (o, leftKeys) => {
		const l = {}
		const r = {}
		let k
		for (k in o) {
			if (k in leftKeys) l[k] = o[k]
			else r[k] = o[k]
		}
		return [l, r]
	}
	var omit = (o, keys) => splitByKeys(o, keys)[1]
	var isEmptyObject = o => Object.keys(o).length === 0
	var stringAndSymbolicEntriesOf = o => [
		...Object.entries(o),
		...Object.getOwnPropertySymbols(o).map(k => [k, o[k]])
	]
	var defineProperties = (base, merged) =>
		// declared like this to avoid https://github.com/microsoft/TypeScript/issues/55049
		Object.defineProperties(base, Object.getOwnPropertyDescriptors(merged))
	var withAlphabetizedKeys = o => {
		const keys = Object.keys(o).sort()
		const result = {}
		for (let i = 0; i < keys.length; i++) result[keys[i]] = o[keys[i]]
		return result
	}
	var unset = noSuggest("represents an uninitialized value")
	var enumValues = tsEnum =>
		Object.values(tsEnum).filter(v => {
			if (typeof v === "number") return true
			return typeof tsEnum[v] !== "number"
		})

	// ../util/out/objectKinds.js
	var ecmascriptConstructors = {
		Array,
		Boolean,
		Date,
		Error,
		Function,
		Map,
		Number,
		Promise,
		RegExp,
		Set,
		String,
		WeakMap,
		WeakSet
	}
	var FileConstructor = globalThis.File ?? Blob
	var platformConstructors = {
		ArrayBuffer,
		Blob,
		File: FileConstructor,
		FormData,
		Headers,
		Request,
		Response,
		URL
	}
	var typedArrayConstructors = {
		Int8Array,
		Uint8Array,
		Uint8ClampedArray,
		Int16Array,
		Uint16Array,
		Int32Array,
		Uint32Array,
		Float32Array,
		Float64Array,
		BigInt64Array,
		BigUint64Array
	}
	var builtinConstructors = {
		...ecmascriptConstructors,
		...platformConstructors,
		...typedArrayConstructors,
		String,
		Number,
		Boolean
	}
	var objectKindOf = data => {
		let prototype = Object.getPrototypeOf(data)
		while (
			prototype?.constructor &&
			(!isKeyOf(prototype.constructor.name, builtinConstructors) ||
				!(data instanceof builtinConstructors[prototype.constructor.name]))
		)
			prototype = Object.getPrototypeOf(prototype)
		const name = prototype?.constructor?.name
		if (name === void 0 || name === "Object") return void 0
		return name
	}
	var objectKindOrDomainOf = data =>
		typeof data === "object" && data !== null ?
			(objectKindOf(data) ?? "object")
		:	domainOf(data)
	var isArray = Array.isArray
	var ecmascriptDescriptions = {
		Array: "an array",
		Function: "a function",
		Date: "a Date",
		RegExp: "a RegExp",
		Error: "an Error",
		Map: "a Map",
		Set: "a Set",
		String: "a String object",
		Number: "a Number object",
		Boolean: "a Boolean object",
		Promise: "a Promise",
		WeakMap: "a WeakMap",
		WeakSet: "a WeakSet"
	}
	var platformDescriptions = {
		ArrayBuffer: "an ArrayBuffer instance",
		Blob: "a Blob instance",
		File: "a File instance",
		FormData: "a FormData instance",
		Headers: "a Headers instance",
		Request: "a Request instance",
		Response: "a Response instance",
		URL: "a URL instance"
	}
	var typedArrayDescriptions = {
		Int8Array: "an Int8Array",
		Uint8Array: "a Uint8Array",
		Uint8ClampedArray: "a Uint8ClampedArray",
		Int16Array: "an Int16Array",
		Uint16Array: "a Uint16Array",
		Int32Array: "an Int32Array",
		Uint32Array: "a Uint32Array",
		Float32Array: "a Float32Array",
		Float64Array: "a Float64Array",
		BigInt64Array: "a BigInt64Array",
		BigUint64Array: "a BigUint64Array"
	}
	var objectKindDescriptions = {
		...ecmascriptDescriptions,
		...platformDescriptions,
		...typedArrayDescriptions
	}
	var getBuiltinNameOfConstructor = ctor => {
		const constructorName = Object(ctor).name ?? null
		return (
				constructorName &&
					isKeyOf(constructorName, builtinConstructors) &&
					builtinConstructors[constructorName] === ctor
			) ?
				constructorName
			:	null
	}
	var constructorExtends = (ctor, base) => {
		let current = ctor.prototype
		while (current !== null) {
			if (current === base.prototype) return true
			current = Object.getPrototypeOf(current)
		}
		return false
	}

	// ../util/out/clone.js
	var deepClone = input => _clone(input, /* @__PURE__ */ new Map())
	var _clone = (input, seen) => {
		if (typeof input !== "object" || input === null) return input
		if (seen?.has(input)) return seen.get(input)
		const builtinConstructorName = getBuiltinNameOfConstructor(
			input.constructor
		)
		if (builtinConstructorName === "Date") return new Date(input.getTime())
		if (builtinConstructorName && builtinConstructorName !== "Array")
			return input
		const cloned =
			Array.isArray(input) ?
				input.slice()
			:	Object.create(Object.getPrototypeOf(input))
		const propertyDescriptors = Object.getOwnPropertyDescriptors(input)
		if (seen) {
			seen.set(input, cloned)
			for (const k in propertyDescriptors) {
				const desc = propertyDescriptors[k]
				if ("get" in desc || "set" in desc) continue
				desc.value = _clone(desc.value, seen)
			}
		}
		Object.defineProperties(cloned, propertyDescriptors)
		return cloned
	}

	// ../util/out/functions.js
	var cached = thunk => {
		let result = unset
		return () => (result === unset ? (result = thunk()) : result)
	}
	var isThunk = value2 => typeof value2 === "function" && value2.length === 0
	var DynamicFunction = class extends Function {
		constructor(...args2) {
			const params = args2.slice(0, -1)
			const body = args2.at(-1)
			try {
				super(...params, body)
			} catch (e) {
				return throwInternalError(`Encountered an unexpected error while compiling your definition:
                Message: ${e} 
                Source: (${args2.slice(0, -1)}) => {
                    ${args2.at(-1)}
                }`)
			}
		}
	}
	var Callable = class {
		constructor(fn, ...[opts]) {
			return Object.assign(
				Object.setPrototypeOf(
					fn.bind(opts?.bind ?? this),
					this.constructor.prototype
				),
				opts?.attach
			)
		}
	}
	var envHasCsp = cached(() => {
		try {
			return new Function("return false")()
		} catch {
			return true
		}
	})

	// ../util/out/generics.js
	var brand = noSuggest("brand")
	var inferred = noSuggest("arkInferred")

	// ../util/out/hkt.js
	var args = noSuggest("args")
	var Hkt = class {
		constructor() {}
	}

	// ../util/out/strings.js
	var capitalize = s => s[0].toUpperCase() + s.slice(1)
	var anchoredRegex = regex =>
		new RegExp(
			anchoredSource(regex),
			typeof regex === "string" ? "" : regex.flags
		)
	var anchoredSource = regex => {
		const source = typeof regex === "string" ? regex : regex.source
		return `^(?:${source})$`
	}
	var RegexPatterns = {
		negativeLookahead: pattern => `(?!${pattern})`,
		nonCapturingGroup: pattern => `(?:${pattern})`
	}
	var escapeChar = "\\"
	var whitespaceChars = {
		" ": 1,
		"\n": 1,
		"	": 1
	}

	// ../util/out/numbers.js
	var anchoredNegativeZeroPattern = /^-0\.?0*$/.source
	var positiveIntegerPattern = /[1-9]\d*/.source
	var looseDecimalPattern = /\.\d+/.source
	var strictDecimalPattern = /\.\d*[1-9]/.source
	var createNumberMatcher = opts =>
		anchoredRegex(
			RegexPatterns.negativeLookahead(anchoredNegativeZeroPattern) +
				RegexPatterns.nonCapturingGroup(
					"-?" +
						RegexPatterns.nonCapturingGroup(
							RegexPatterns.nonCapturingGroup("0|" + positiveIntegerPattern) +
								RegexPatterns.nonCapturingGroup(opts.decimalPattern) +
								"?"
						) +
						(opts.allowDecimalOnly ? "|" + opts.decimalPattern : "") +
						"?"
				)
		)
	var wellFormedNumberMatcher = createNumberMatcher({
		decimalPattern: strictDecimalPattern,
		allowDecimalOnly: false
	})
	var isWellFormedNumber = wellFormedNumberMatcher.test.bind(
		wellFormedNumberMatcher
	)
	var numericStringMatcher = createNumberMatcher({
		decimalPattern: looseDecimalPattern,
		allowDecimalOnly: true
	})
	var isNumericString = numericStringMatcher.test.bind(numericStringMatcher)
	var numberLikeMatcher = /^-?\d*\.?\d*$/
	var isNumberLike = s => s.length !== 0 && numberLikeMatcher.test(s)
	var wellFormedIntegerMatcher = anchoredRegex(
		RegexPatterns.negativeLookahead("^-0$") +
			"-?" +
			RegexPatterns.nonCapturingGroup(
				RegexPatterns.nonCapturingGroup("0|" + positiveIntegerPattern)
			)
	)
	var isWellFormedInteger = wellFormedIntegerMatcher.test.bind(
		wellFormedIntegerMatcher
	)
	var integerLikeMatcher = /^-?\d+$/
	var isIntegerLike = integerLikeMatcher.test.bind(integerLikeMatcher)
	var numericLiteralDescriptions = {
		number: "a number",
		bigint: "a bigint",
		integer: "an integer"
	}
	var writeMalformedNumericLiteralMessage = (def, kind) =>
		`'${def}' was parsed as ${numericLiteralDescriptions[kind]} but could not be narrowed to a literal value. Avoid unnecessary leading or trailing zeros and other abnormal notation`
	var isWellFormed = (def, kind) =>
		kind === "number" ? isWellFormedNumber(def) : isWellFormedInteger(def)
	var parseKind = (def, kind) =>
		kind === "number" ? Number(def) : Number.parseInt(def)
	var isKindLike = (def, kind) =>
		kind === "number" ? isNumberLike(def) : isIntegerLike(def)
	var tryParseNumber = (token, options) =>
		parseNumeric(token, "number", options)
	var tryParseWellFormedNumber = (token, options) =>
		parseNumeric(token, "number", { ...options, strict: true })
	var tryParseInteger = (token, options) =>
		parseNumeric(token, "integer", options)
	var parseNumeric = (token, kind, options) => {
		const value2 = parseKind(token, kind)
		if (!Number.isNaN(value2)) {
			if (isKindLike(token, kind)) {
				if (options?.strict) {
					return isWellFormed(token, kind) ? value2 : (
							throwParseError(writeMalformedNumericLiteralMessage(token, kind))
						)
				}
				return value2
			}
		}
		return options?.errorOnFail ?
				throwParseError(
					options?.errorOnFail === true ?
						`Failed to parse ${numericLiteralDescriptions[kind]} from '${token}'`
					:	options?.errorOnFail
				)
			:	void 0
	}
	var tryParseWellFormedBigint = def => {
		if (def[def.length - 1] !== "n") return
		const maybeIntegerLiteral = def.slice(0, -1)
		let value2
		try {
			value2 = BigInt(maybeIntegerLiteral)
		} catch {
			return
		}
		if (wellFormedIntegerMatcher.test(maybeIntegerLiteral)) return value2
		if (integerLikeMatcher.test(maybeIntegerLiteral)) {
			return throwParseError(writeMalformedNumericLiteralMessage(def, "bigint"))
		}
	}

	// ../util/out/fileName.js
	var fileName = () => {
		try {
			const error = new Error()
			const stackLine = error.stack?.split("\n")[2]?.trim() || ""
			const filePath =
				stackLine.match(/\(?(.+?)(?::\d+:\d+)?\)?$/)?.[1] || "unknown"
			return filePath.replace(/^file:\/\//, "")
		} catch {
			return "unknown"
		}
	}

	// ../util/out/registry.js
	var arkUtilVersion = "0.45.6"
	var initialRegistryContents = {
		version: arkUtilVersion,
		filename: fileName(),
		FileConstructor
	}
	var registry = initialRegistryContents
	var namesByResolution = /* @__PURE__ */ new WeakMap()
	var nameCounts = /* @__PURE__ */ Object.create(null)
	var register = value2 => {
		const existingName = namesByResolution.get(value2)
		if (existingName) return existingName
		let name = baseNameFor(value2)
		if (nameCounts[name]) name = `${name}${nameCounts[name]++}`
		else nameCounts[name] = 1
		registry[name] = value2
		namesByResolution.set(value2, name)
		return name
	}
	var isDotAccessible = keyName => /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(keyName)
	var baseNameFor = value2 => {
		switch (typeof value2) {
			case "object": {
				if (value2 === null) break
				const prefix = objectKindOf(value2) ?? "object"
				return prefix[0].toLowerCase() + prefix.slice(1)
			}
			case "function":
				return isDotAccessible(value2.name) ? value2.name : "fn"
			case "symbol":
				return value2.description && isDotAccessible(value2.description) ?
						value2.description
					:	"symbol"
		}
		return throwInternalError(
			`Unexpected attempt to register serializable value of type ${domainOf(value2)}`
		)
	}

	// ../util/out/primitive.js
	var serializePrimitive = value2 =>
		typeof value2 === "string" ? JSON.stringify(value2)
		: typeof value2 === "bigint" ? `${value2}n`
		: `${value2}`

	// ../util/out/serialize.js
	var snapshot = (data, opts = {}) =>
		_serialize(
			data,
			{
				onUndefined: `$ark.undefined`,
				onBigInt: n => `$ark.bigint-${n}`,
				...opts
			},
			[]
		)
	var printable = (data, indent2) => {
		switch (domainOf(data)) {
			case "object":
				const o = data
				const ctorName = o.constructor.name
				return (
					ctorName === "Object" || ctorName === "Array" ?
						JSON.stringify(_serialize(o, printableOpts, []), null, indent2)
					: o instanceof Date ? describeCollapsibleDate(o)
					: typeof o.expression === "string" ? o.expression
					: ctorName
				)
			case "symbol":
				return printableOpts.onSymbol(data)
			default:
				return serializePrimitive(data)
		}
	}
	var printableOpts = {
		onCycle: () => "(cycle)",
		onSymbol: v => `Symbol(${register(v)})`,
		onFunction: v => `Function(${register(v)})`
	}
	var _serialize = (data, opts, seen) => {
		switch (domainOf(data)) {
			case "object": {
				const o = data
				if ("toJSON" in o && typeof o.toJSON === "function") return o.toJSON()
				if (typeof o === "function") return printableOpts.onFunction(o)
				if (seen.includes(o)) return "(cycle)"
				const nextSeen = [...seen, o]
				if (Array.isArray(o))
					return o.map(item => _serialize(item, opts, nextSeen))
				if (o instanceof Date) return o.toDateString()
				const result = {}
				for (const k in o) result[k] = _serialize(o[k], opts, nextSeen)
				for (const s of Object.getOwnPropertySymbols(o)) {
					result[opts.onSymbol?.(s) ?? s.toString()] = _serialize(
						o[s],
						opts,
						nextSeen
					)
				}
				return result
			}
			case "symbol":
				return printableOpts.onSymbol(data)
			case "bigint":
				return opts.onBigInt?.(data) ?? `${data}n`
			case "undefined":
				return opts.onUndefined ?? "undefined"
			case "string":
				return data.replaceAll("\\", "\\\\")
			default:
				return data
		}
	}
	var describeCollapsibleDate = date => {
		const year = date.getFullYear()
		const month = date.getMonth()
		const dayOfMonth = date.getDate()
		const hours = date.getHours()
		const minutes = date.getMinutes()
		const seconds = date.getSeconds()
		const milliseconds = date.getMilliseconds()
		if (
			month === 0 &&
			dayOfMonth === 1 &&
			hours === 0 &&
			minutes === 0 &&
			seconds === 0 &&
			milliseconds === 0
		)
			return `${year}`
		const datePortion = `${months[month]} ${dayOfMonth}, ${year}`
		if (hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0)
			return datePortion
		let timePortion = date.toLocaleTimeString()
		const suffix2 =
			timePortion.endsWith(" AM") || timePortion.endsWith(" PM") ?
				timePortion.slice(-3)
			:	""
		if (suffix2) timePortion = timePortion.slice(0, -suffix2.length)
		if (milliseconds) timePortion += `.${pad(milliseconds, 3)}`
		else if (timeWithUnnecessarySeconds.test(timePortion))
			timePortion = timePortion.slice(0, -3)
		return `${timePortion + suffix2}, ${datePortion}`
	}
	var months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	]
	var timeWithUnnecessarySeconds = /:\d\d:00$/
	var pad = (value2, length) => String(value2).padStart(length, "0")

	// ../util/out/path.js
	var appendStringifiedKey = (path, prop, ...[opts]) => {
		const stringifySymbol = opts?.stringifySymbol ?? printable
		let propAccessChain = path
		switch (typeof prop) {
			case "string":
				propAccessChain =
					isDotAccessible(prop) ?
						path === "" ?
							prop
						:	`${path}.${prop}`
					:	`${path}[${JSON.stringify(prop)}]`
				break
			case "number":
				propAccessChain = `${path}[${prop}]`
				break
			case "symbol":
				propAccessChain = `${path}[${stringifySymbol(prop)}]`
				break
			default:
				if (opts?.stringifyNonKey)
					propAccessChain = `${path}[${opts.stringifyNonKey(prop)}]`
				else {
					throwParseError(
						`${printable(prop)} must be a PropertyKey or stringifyNonKey must be passed to options`
					)
				}
		}
		return propAccessChain
	}
	var stringifyPath = (path, ...opts) =>
		path.reduce((s, k) => appendStringifiedKey(s, k, ...opts), "")
	var ReadonlyPath = class extends ReadonlyArray {
		// alternate strategy for caching since the base object is frozen
		cache = {}
		constructor(...items) {
			super()
			this.push(...items)
		}
		toJSON() {
			if (this.cache.json) return this.cache.json
			this.cache.json = []
			for (let i = 0; i < this.length; i++) {
				this.cache.json.push(
					typeof this[i] === "symbol" ? printable(this[i]) : this[i]
				)
			}
			return this.cache.json
		}
		stringify() {
			if (this.cache.stringify) return this.cache.stringify
			return (this.cache.stringify = stringifyPath(this))
		}
		stringifyAncestors() {
			if (this.cache.stringifyAncestors) return this.cache.stringifyAncestors
			let propString = ""
			const result = [propString]
			this.forEach(path => {
				propString = appendStringifiedKey(propString, path)
				result.push(propString)
			})
			return (this.cache.stringifyAncestors = result)
		}
	}

	// ../util/out/scanner.js
	var Scanner = class {
		chars
		i
		def
		constructor(def) {
			this.def = def
			this.chars = [...def]
			this.i = 0
		}
		/** Get lookahead and advance scanner by one */
		shift() {
			return this.chars[this.i++] ?? ""
		}
		get lookahead() {
			return this.chars[this.i] ?? ""
		}
		get nextLookahead() {
			return this.chars[this.i + 1] ?? ""
		}
		get length() {
			return this.chars.length
		}
		shiftUntil(condition) {
			let shifted = ""
			while (this.lookahead) {
				if (condition(this, shifted)) {
					if (shifted[shifted.length - 1] === escapeChar)
						shifted = shifted.slice(0, -1)
					else break
				}
				shifted += this.shift()
			}
			return shifted
		}
		shiftUntilLookahead(charOrSet) {
			return typeof charOrSet === "string" ?
					this.shiftUntil(s => s.lookahead === charOrSet)
				:	this.shiftUntil(s => s.lookahead in charOrSet)
		}
		shiftUntilNonWhitespace() {
			return this.shiftUntil(() => !(this.lookahead in whitespaceChars))
		}
		jumpToIndex(i) {
			this.i = i < 0 ? this.length + i : i
		}
		jumpForward(count) {
			this.i += count
		}
		get location() {
			return this.i
		}
		get unscanned() {
			return this.chars.slice(this.i, this.length).join("")
		}
		get scanned() {
			return this.chars.slice(0, this.i).join("")
		}
		sliceChars(start, end) {
			return this.chars.slice(start, end).join("")
		}
		lookaheadIs(char) {
			return this.lookahead === char
		}
		lookaheadIsIn(tokens) {
			return this.lookahead in tokens
		}
	}

	// ../util/out/traits.js
	var implementedTraits = noSuggest("implementedTraits")

	// ../schema/out/shared/registry.js
	var _registryName = "$ark"
	var suffix = 2
	while (_registryName in globalThis) _registryName = `$ark${suffix++}`
	var registryName = _registryName
	globalThis[registryName] = registry
	var $ark = registry
	if (suffix !== 2) {
		const g = globalThis
		const registries = [g.$ark]
		for (let i = 2; i < suffix; i++)
			if (g[`$ark${i}`]) registries.push(g[`$ark${i}`])
		console.warn(
			`Multiple @ark registries detected. This can lead to unexpected behavior.`
		)
		const byPath = groupBy(registries, "filename")
		const paths = Object.keys(byPath)
		for (const path of paths) {
			if (byPath[path].length > 1) {
				console.warn(
					`File ${path} was initialized multiple times, likely due to being imported from both CJS and ESM contexts.`
				)
			}
		}
		if (paths.length > 1) {
			console.warn(
				`Registries were initialized at the following paths:` +
					paths
						.map(
							path => `	${path} (@ark/util version ${byPath[path][0].version})`
						)
						.join("\n")
			)
		}
	}
	var reference = name => `${registryName}.${name}`
	var registeredReference = value2 => reference(register(value2))

	// ../schema/out/shared/compile.js
	var CompiledFunction = class extends CastableBase {
		argNames
		body = ""
		constructor(...args2) {
			super()
			this.argNames = args2
			for (const arg of args2) {
				if (arg in this) {
					throw new Error(
						`Arg name '${arg}' would overwrite an existing property on FunctionBody`
					)
				}
				this[arg] = arg
			}
		}
		indentation = 0
		indent() {
			this.indentation += 4
			return this
		}
		dedent() {
			this.indentation -= 4
			return this
		}
		prop(key, optional = false) {
			return compileLiteralPropAccess(key, optional)
		}
		index(key, optional = false) {
			return indexPropAccess(`${key}`, optional)
		}
		line(statement) {
			this.body += `${" ".repeat(this.indentation)}${statement}
`
			return this
		}
		const(identifier, expression) {
			this.line(`const ${identifier} = ${expression}`)
			return this
		}
		let(identifier, expression) {
			return this.line(`let ${identifier} = ${expression}`)
		}
		set(identifier, expression) {
			return this.line(`${identifier} = ${expression}`)
		}
		if(condition, then) {
			return this.block(`if (${condition})`, then)
		}
		elseIf(condition, then) {
			return this.block(`else if (${condition})`, then)
		}
		else(then) {
			return this.block("else", then)
		}
		/** Current index is "i" */
		for(until, body, initialValue = 0) {
			return this.block(`for (let i = ${initialValue}; ${until}; i++)`, body)
		}
		/** Current key is "k" */
		forIn(object2, body) {
			return this.block(`for (const k in ${object2})`, body)
		}
		block(prefix, contents, suffix2 = "") {
			this.line(`${prefix} {`)
			this.indent()
			contents(this)
			this.dedent()
			return this.line(`}${suffix2}`)
		}
		return(expression = "") {
			return this.line(`return ${expression}`)
		}
		write(name = "anonymous") {
			return `${name}(${this.argNames.join(", ")}) {
${this.body}}`
		}
		compile() {
			return new DynamicFunction(...this.argNames, this.body)
		}
	}
	var compileSerializedValue = value2 =>
		hasDomain(value2, "object") || typeof value2 === "symbol" ?
			registeredReference(value2)
		:	serializePrimitive(value2)
	var compileLiteralPropAccess = (key, optional = false) => {
		if (typeof key === "string" && isDotAccessible(key))
			return `${optional ? "?" : ""}.${key}`
		return indexPropAccess(serializeLiteralKey(key), optional)
	}
	var serializeLiteralKey = key =>
		typeof key === "symbol" ? registeredReference(key) : JSON.stringify(key)
	var indexPropAccess = (key, optional = false) =>
		`${optional ? "?." : ""}[${key}]`
	var NodeCompiler = class extends CompiledFunction {
		traversalKind
		optimistic
		constructor(ctx) {
			super("data", "ctx")
			this.traversalKind = ctx.kind
			this.optimistic = ctx.optimistic === true
		}
		invoke(node2, opts) {
			const arg = opts?.arg ?? this.data
			const requiresContext =
				typeof node2 === "string" ? true : this.requiresContextFor(node2)
			const id = typeof node2 === "string" ? node2 : node2.id
			if (requiresContext)
				return `${this.referenceToId(id, opts)}(${arg}, ${this.ctx})`
			return `${this.referenceToId(id, opts)}(${arg})`
		}
		referenceToId(id, opts) {
			const invokedKind = opts?.kind ?? this.traversalKind
			const base = `this.${id}${invokedKind}`
			return opts?.bind ? `${base}.bind(${opts?.bind})` : base
		}
		requiresContextFor(node2) {
			return this.traversalKind === "Apply" || node2.allowsRequiresContext
		}
		initializeErrorCount() {
			return this.const("errorCount", "ctx.currentErrorCount")
		}
		returnIfFail() {
			return this.if("ctx.currentErrorCount > errorCount", () => this.return())
		}
		returnIfFailFast() {
			return this.if("ctx.failFast && ctx.currentErrorCount > errorCount", () =>
				this.return()
			)
		}
		traverseKey(keyExpression, accessExpression, node2) {
			const requiresContext = this.requiresContextFor(node2)
			if (requiresContext) this.line(`${this.ctx}.path.push(${keyExpression})`)
			this.check(node2, {
				arg: accessExpression
			})
			if (requiresContext) this.line(`${this.ctx}.path.pop()`)
			return this
		}
		check(node2, opts) {
			return this.traversalKind === "Allows" ?
					this.if(`!${this.invoke(node2, opts)}`, () => this.return(false))
				:	this.line(this.invoke(node2, opts))
		}
	}

	// ../schema/out/shared/utils.js
	var makeRootAndArrayPropertiesMutable = o =>
		// this cast should not be required, but it seems TS is referencing
		// the wrong parameters here?
		flatMorph(o, (k, v) => [k, isArray(v) ? [...v] : v])
	var arkKind = noSuggest("arkKind")
	var hasArkKind = (value2, kind) => value2?.[arkKind] === kind
	var isNode = value2 =>
		hasArkKind(value2, "root") || hasArkKind(value2, "constraint")

	// ../schema/out/shared/implement.js
	var basisKinds = ["unit", "proto", "domain"]
	var structuralKinds = ["required", "optional", "index", "sequence"]
	var refinementKinds = [
		"pattern",
		"divisor",
		"exactLength",
		"max",
		"min",
		"maxLength",
		"minLength",
		"before",
		"after"
	]
	var constraintKinds = [
		...refinementKinds,
		...structuralKinds,
		"structure",
		"predicate"
	]
	var rootKinds = [
		"alias",
		"union",
		"morph",
		"unit",
		"intersection",
		"proto",
		"domain"
	]
	var nodeKinds = [...rootKinds, ...constraintKinds]
	var constraintKeys = flatMorph(constraintKinds, (i, kind) => [kind, 1])
	var structureKeys = flatMorph([...structuralKinds, "undeclared"], (i, k) => [
		k,
		1
	])
	var precedenceByKind = flatMorph(nodeKinds, (i, kind) => [kind, i])
	var isNodeKind = value2 =>
		typeof value2 === "string" && value2 in precedenceByKind
	var precedenceOfKind = kind => precedenceByKind[kind]
	var schemaKindsRightOf = kind => rootKinds.slice(precedenceOfKind(kind) + 1)
	var unionChildKinds = [...schemaKindsRightOf("union"), "alias"]
	var morphChildKinds = [...schemaKindsRightOf("morph"), "alias"]
	var defaultValueSerializer = v => {
		if (typeof v === "string" || typeof v === "boolean" || v === null) return v
		if (typeof v === "number") {
			if (Number.isNaN(v)) return "NaN"
			if (v === Number.POSITIVE_INFINITY) return "Infinity"
			if (v === Number.NEGATIVE_INFINITY) return "-Infinity"
			return v
		}
		return compileSerializedValue(v)
	}
	var compileObjectLiteral = ctx => {
		let result = "{ "
		for (const [k, v] of Object.entries(ctx))
			result += `${k}: ${compileSerializedValue(v)}, `
		return result + " }"
	}
	var implementNode = _ => {
		const implementation23 = _
		if (implementation23.hasAssociatedError) {
			implementation23.defaults.expected ??= ctx =>
				"description" in ctx ?
					ctx.description
				:	implementation23.defaults.description(ctx)
			implementation23.defaults.actual ??= data => printable(data)
			implementation23.defaults.problem ??= ctx =>
				`must be ${ctx.expected}${ctx.actual ? ` (was ${ctx.actual})` : ""}`
			implementation23.defaults.message ??= ctx => {
				if (ctx.path.length === 0) return ctx.problem
				const problemWithLocation = `${ctx.propString} ${ctx.problem}`
				if (problemWithLocation[0] === "[") {
					return `value at ${problemWithLocation}`
				}
				return problemWithLocation
			}
		}
		return implementation23
	}

	// ../schema/out/config.js
	$ark.config ??= {}
	var configureSchema = config => {
		const result = Object.assign($ark.config, mergeConfigs($ark.config, config))
		$ark.resolvedConfig &&= mergeConfigs($ark.resolvedConfig, result)
		return result
	}
	var mergeConfigs = (base, extensions) => {
		if (!extensions) return base
		const result = { ...base }
		let k
		for (k in extensions) {
			const keywords2 = { ...base.keywords }
			if (k === "keywords") {
				for (const flatAlias in extensions[k]) {
					const v = extensions.keywords[flatAlias]
					if (v === void 0) continue
					keywords2[flatAlias] = typeof v === "string" ? { description: v } : v
				}
				result.keywords = keywords2
			} else {
				result[k] =
					isNodeKind(k) ?
						// not casting this makes TS compute a very inefficient
						// type that is not needed
						{
							...base[k],
							...extensions[k]
						}
					:	extensions[k]
			}
		}
		return result
	}

	// ../schema/out/shared/errors.js
	var ArkError = class _ArkError extends CastableBase {
		[arkKind] = "error"
		path
		data
		nodeConfig
		input
		ctx
		// TS gets confused by <code>, so internally we just use the base type for input
		constructor({ prefixPath, relativePath, ...input }, ctx) {
			super()
			this.input = input
			this.ctx = ctx
			defineProperties(this, input)
			const data = ctx.data
			if (input.code === "union") {
				input.errors = input.errors.flatMap(innerError => {
					const flat =
						innerError.hasCode("union") ? innerError.errors : [innerError]
					if (!prefixPath && !relativePath) return flat
					return flat.map(e =>
						e.transform(e2 => ({
							...e2,
							path: conflatenateAll(prefixPath, e2.path, relativePath)
						}))
					)
				})
			}
			this.nodeConfig = ctx.config[this.code]
			const basePath = [...(input.path ?? ctx.path)]
			if (relativePath) basePath.push(...relativePath)
			if (prefixPath) basePath.unshift(...prefixPath)
			this.path = new ReadonlyPath(...basePath)
			this.data = "data" in input ? input.data : data
		}
		transform(f) {
			return new _ArkError(
				f({
					data: this.data,
					path: this.path,
					...this.input
				}),
				this.ctx
			)
		}
		hasCode(code) {
			return this.code === code
		}
		get propString() {
			return stringifyPath(this.path)
		}
		get expected() {
			if (this.input.expected) return this.input.expected
			const config = this.meta?.expected ?? this.nodeConfig.expected
			return typeof config === "function" ? config(this.input) : config
		}
		get actual() {
			if (this.input.actual) return this.input.actual
			const config = this.meta?.actual ?? this.nodeConfig.actual
			return typeof config === "function" ? config(this.data) : config
		}
		get problem() {
			if (this.input.problem) return this.input.problem
			const config = this.meta?.problem ?? this.nodeConfig.problem
			return typeof config === "function" ? config(this) : config
		}
		get message() {
			if (this.input.message) return this.input.message
			const config = this.meta?.message ?? this.nodeConfig.message
			return typeof config === "function" ? config(this) : config
		}
		get flat() {
			return this.hasCode("intersection") ? [...this.errors] : [this]
		}
		toJSON() {
			return {
				data: this.data,
				path: this.path,
				...this.input,
				expected: this.expected,
				actual: this.actual,
				problem: this.problem,
				message: this.message
			}
		}
		toString() {
			return this.message
		}
		throw() {
			throw this
		}
	}
	var ArkErrors = class _ArkErrors extends ReadonlyArray {
		ctx
		constructor(ctx) {
			super()
			this.ctx = ctx
		}
		/**
		 * Errors by a pathString representing their location.
		 */
		byPath = /* @__PURE__ */ Object.create(null)
		/**
		 * {@link byPath} flattened so that each value is an array of ArkError instances at that path.
		 *
		 * ✅ Since "intersection" errors will be flattened to their constituent `.errors`,
		 * they will never be directly present in this representation.
		 */
		get flatByPath() {
			return flatMorph(this.byPath, (k, v) => [k, v.flat])
		}
		/**
		 * {@link byPath} flattened so that each value is an array of problem strings at that path.
		 */
		get flatProblemsByPath() {
			return flatMorph(this.byPath, (k, v) => [k, v.flat.map(e => e.problem)])
		}
		/**
		 * All pathStrings at which errors are present mapped to the errors occuring
		 * at that path or any nested path within it.
		 */
		byAncestorPath = /* @__PURE__ */ Object.create(null)
		count = 0
		mutable = this
		/**
		 * Throw a TraversalError based on these errors.
		 */
		throw() {
			throw this.toTraversalError()
		}
		/**
		 * Converts ArkErrors to TraversalError, a subclass of `Error` suitable for throwing with nice
		 * formatting.
		 */
		toTraversalError() {
			return new TraversalError(this)
		}
		/**
		 * Append an ArkError to this array, ignoring duplicates.
		 */
		add(error) {
			if (this.includes(error)) return
			this._add(error)
		}
		transform(f) {
			const result = new _ArkErrors(this.ctx)
			this.forEach(e => result.add(f(e)))
			return result
		}
		/**
		 * Add all errors from an ArkErrors instance, ignoring duplicates and
		 * prefixing their paths with that of the current Traversal.
		 */
		merge(errors) {
			errors.forEach(e => {
				if (this.includes(e)) return
				this._add(
					new ArkError({ ...e, path: [...this.ctx.path, ...e.path] }, this.ctx)
				)
			})
		}
		/**
		 * @internal
		 */
		affectsPath(path) {
			if (this.length === 0) return false
			return (
				// this would occur if there is an existing error at a prefix of path
				// e.g. the path is ["foo", "bar"] and there is an error at ["foo"]
				path.stringifyAncestors().some(s => s in this.byPath) || // this would occur if there is an existing error at a suffix of path
				// e.g. the path is ["foo"] and there is an error at ["foo", "bar"]
				path.stringify() in this.byAncestorPath
			)
		}
		/**
		 * A human-readable summary of all errors.
		 */
		get summary() {
			return this.toString()
		}
		/**
		 * Alias of this ArkErrors instance for StandardSchema compatibility.
		 */
		get issues() {
			return this
		}
		toJSON() {
			return [...this.map(e => e.toJSON())]
		}
		toString() {
			return this.join("\n")
		}
		_add(error) {
			const existing = this.byPath[error.propString]
			if (existing) {
				const errorIntersection = new ArkError(
					{
						code: "intersection",
						errors:
							existing.hasCode("intersection") ?
								[...existing.errors, error]
							:	[existing, error]
					},
					this.ctx
				)
				const existingIndex = this.indexOf(existing)
				this.mutable[existingIndex === -1 ? this.length : existingIndex] =
					errorIntersection
				this.byPath[error.propString] = errorIntersection
				this.addAncestorPaths(error)
			} else {
				this.byPath[error.propString] = error
				this.addAncestorPaths(error)
				this.mutable.push(error)
			}
			this.count++
		}
		addAncestorPaths(error) {
			error.path.stringifyAncestors().forEach(propString => {
				this.byAncestorPath[propString] = append(
					this.byAncestorPath[propString],
					error
				)
			})
		}
	}
	var TraversalError = class extends Error {
		name = "TraversalError"
		constructor(errors) {
			if (errors.length === 1) super(errors.summary)
			else
				super(
					"\n" + errors.map(error => `  \u2022 ${indent(error)}`).join("\n")
				)
			Object.defineProperty(this, "arkErrors", {
				value: errors,
				enumerable: false
			})
		}
	}
	var indent = error => error.toString().split("\n").join("\n  ")

	// ../schema/out/shared/traversal.js
	var Traversal = class {
		/**
		 * #### the path being validated or morphed
		 *
		 * ✅ array indices represented as numbers
		 * ⚠️ mutated during traversal - use `path.slice(0)` to snapshot
		 * 🔗 use {@link propString} for a stringified version
		 */
		path = []
		/**
		 * #### {@link ArkErrors} that will be part of this traversal's finalized result
		 *
		 * ✅ will always be an empty array for a valid traversal
		 */
		errors = new ArkErrors(this)
		/**
		 * #### the original value being traversed
		 */
		root
		/**
		 * #### configuration for this traversal
		 *
		 * ✅ options can affect traversal results and error messages
		 * ✅ defaults < global config < scope config
		 * ✅ does not include options configured on individual types
		 */
		config
		queuedMorphs = []
		branches = []
		seen = {}
		constructor(root, config) {
			this.root = root
			this.config = config
		}
		/**
		 * #### the data being validated or morphed
		 *
		 * ✅ extracted from {@link root} at {@link path}
		 */
		get data() {
			let result = this.root
			for (const segment of this.path) result = result?.[segment]
			return result
		}
		/**
		 * #### a string representing {@link path}
		 *
		 * @propString
		 */
		get propString() {
			return stringifyPath(this.path)
		}
		/**
		 * #### add an {@link ArkError} and return `false`
		 *
		 * ✅ useful for predicates like `.narrow`
		 */
		reject(input) {
			this.error(input)
			return false
		}
		/**
		 * #### add an {@link ArkError} from a description and return `false`
		 *
		 * ✅ useful for predicates like `.narrow`
		 * 🔗 equivalent to {@link reject}({ expected })
		 */
		mustBe(expected) {
			this.error(expected)
			return false
		}
		error(input) {
			const errCtx =
				typeof input === "object" ?
					input.code ?
						input
					:	{ ...input, code: "predicate" }
				:	{ code: "predicate", expected: input }
			return this.errorFromContext(errCtx)
		}
		/**
		 * #### whether {@link currentBranch} (or the traversal root, outside a union) has one or more errors
		 */
		hasError() {
			return this.currentErrorCount !== 0
		}
		get currentBranch() {
			return this.branches.at(-1)
		}
		queueMorphs(morphs) {
			const input = {
				path: new ReadonlyPath(...this.path),
				morphs
			}
			if (this.currentBranch) this.currentBranch.queuedMorphs.push(input)
			else this.queuedMorphs.push(input)
		}
		finalize(onFail) {
			if (this.queuedMorphs.length) {
				if (
					typeof this.root === "object" &&
					this.root !== null &&
					this.config.clone
				)
					this.root = this.config.clone(this.root)
				this.applyQueuedMorphs()
			}
			if (this.hasError()) return onFail ? onFail(this.errors) : this.errors
			return this.root
		}
		get currentErrorCount() {
			return (
				this.currentBranch ?
					this.currentBranch.error ?
						1
					:	0
				:	this.errors.count
			)
		}
		get failFast() {
			return this.branches.length !== 0
		}
		pushBranch() {
			this.branches.push({
				error: void 0,
				queuedMorphs: []
			})
		}
		popBranch() {
			return this.branches.pop()
		}
		/**
		 * @internal
		 * Convenience for casting from InternalTraversal to Traversal
		 * for cases where the extra methods on the external type are expected, e.g.
		 * a morph or predicate.
		 */
		get external() {
			return this
		}
		errorFromNodeContext(input) {
			return this.errorFromContext(input)
		}
		errorFromContext(errCtx) {
			const error = new ArkError(errCtx, this)
			if (this.currentBranch) this.currentBranch.error = error
			else this.errors.add(error)
			return error
		}
		applyQueuedMorphs() {
			while (this.queuedMorphs.length) {
				const queuedMorphs = this.queuedMorphs
				this.queuedMorphs = []
				for (const { path, morphs } of queuedMorphs) {
					if (this.errors.affectsPath(path)) continue
					this.applyMorphsAtPath(path, morphs)
				}
			}
		}
		applyMorphsAtPath(path, morphs) {
			const key = path.at(-1)
			let parent
			if (key !== void 0) {
				parent = this.root
				for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++)
					parent = parent[path[pathIndex]]
			}
			this.path = [...path]
			for (const morph of morphs) {
				const morphIsNode = isNode(morph)
				const result = morph(parent === void 0 ? this.root : parent[key], this)
				if (result instanceof ArkError) {
					this.errors.add(result)
					break
				}
				if (result instanceof ArkErrors) {
					if (!morphIsNode) {
						this.errors.merge(result)
					}
					break
				}
				if (parent === void 0) this.root = result
				else parent[key] = result
				this.applyQueuedMorphs()
			}
		}
	}
	var traverseKey = (key, fn, ctx) => {
		if (!ctx) return fn()
		ctx.path.push(key)
		const result = fn()
		ctx.path.pop()
		return result
	}

	// ../schema/out/node.js
	var BaseNode = class extends Callable {
		attachments
		$
		onFail
		includesTransform
		// if a predicate accepts exactly one arg, we can safely skip passing context
		// technically, a predicate could be written like `(data, ...[ctx]) => ctx.mustBe("malicious")`
		// that would break here, but it feels like a pathological case and is better to let people optimize
		includesContextualPredicate
		isCyclic
		allowsRequiresContext
		rootApplyStrategy
		contextFreeMorph
		rootApply
		referencesById
		shallowReferences
		flatRefs
		flatMorphs
		allows
		get shallowMorphs() {
			return []
		}
		constructor(attachments, $) {
			super(
				(data, pipedFromCtx, onFail = this.onFail) => {
					if (pipedFromCtx) {
						this.traverseApply(data, pipedFromCtx)
						return pipedFromCtx.hasError() ?
								pipedFromCtx.errors
							:	pipedFromCtx.data
					}
					return this.rootApply(data, onFail)
				},
				{ attach: attachments }
			)
			this.attachments = attachments
			this.$ = $
			this.onFail = this.meta.onFail ?? this.$.resolvedConfig.onFail
			this.includesTransform =
				this.hasKind("morph") ||
				(this.hasKind("structure") && this.structuralMorph !== void 0)
			this.includesContextualPredicate =
				this.hasKind("predicate") && this.inner.predicate.length !== 1
			this.isCyclic = this.kind === "alias"
			this.referencesById = { [this.id]: this }
			this.shallowReferences =
				this.hasKind("structure") ?
					[this, ...this.children]
				:	this.children.reduce(
						(acc, child) => appendUniqueNodes(acc, child.shallowReferences),
						[this]
					)
			const isStructural = this.isStructural()
			this.flatRefs = []
			this.flatMorphs = []
			for (let i = 0; i < this.children.length; i++) {
				this.includesTransform ||= this.children[i].includesTransform
				this.includesContextualPredicate ||=
					this.children[i].includesContextualPredicate
				this.isCyclic ||= this.children[i].isCyclic
				if (!isStructural) {
					const childFlatRefs = this.children[i].flatRefs
					for (let j = 0; j < childFlatRefs.length; j++) {
						const childRef = childFlatRefs[j]
						if (
							!this.flatRefs.some(existing =>
								flatRefsAreEqual(existing, childRef)
							)
						) {
							this.flatRefs.push(childRef)
							for (const branch of childRef.node.branches) {
								if (
									branch.hasKind("morph") ||
									(branch.hasKind("intersection") &&
										branch.structure?.structuralMorph !== void 0)
								) {
									this.flatMorphs.push({
										path: childRef.path,
										propString: childRef.propString,
										node: branch
									})
								}
							}
						}
					}
				}
				Object.assign(this.referencesById, this.children[i].referencesById)
			}
			this.flatRefs.sort((l, r) =>
				l.path.length > r.path.length ? 1
				: l.path.length < r.path.length ? -1
				: l.propString > r.propString ? 1
				: l.propString < r.propString ? -1
				: l.node.expression < r.node.expression ? -1
				: 1
			)
			this.allowsRequiresContext =
				this.includesContextualPredicate || this.isCyclic
			this.rootApplyStrategy =
				!this.allowsRequiresContext && this.flatMorphs.length === 0 ?
					this.shallowMorphs.length === 0 ? "allows"
					: (
						this.shallowMorphs.every(
							morph =>
								morph.length === 1 || morph.name === "$arkStructuralMorph"
						)
					) ?
						this.hasKind("union") ?
							// multiple morphs not yet supported for optimistic compilation
							this.branches.some(branch => branch.shallowMorphs.length > 1) ?
								"contextual"
							:	"branchedOptimistic"
						: this.shallowMorphs.length > 1 ? "contextual"
						: "optimistic"
					:	"contextual"
				:	"contextual"
			this.rootApply = this.createRootApply()
			this.allows =
				this.allowsRequiresContext ?
					data =>
						this.traverseAllows(
							data,
							new Traversal(data, this.$.resolvedConfig)
						)
				:	data => this.traverseAllows(data)
		}
		createRootApply() {
			switch (this.rootApplyStrategy) {
				case "allows":
					return (data, onFail) => {
						if (this.allows(data)) return data
						const ctx = new Traversal(data, this.$.resolvedConfig)
						this.traverseApply(data, ctx)
						return ctx.finalize(onFail)
					}
				case "contextual":
					return (data, onFail) => {
						const ctx = new Traversal(data, this.$.resolvedConfig)
						this.traverseApply(data, ctx)
						return ctx.finalize(onFail)
					}
				case "optimistic":
					this.contextFreeMorph = this.shallowMorphs[0]
					const clone = this.$.resolvedConfig.clone
					return (data, onFail) => {
						if (this.allows(data)) {
							return this.contextFreeMorph(
								(
									clone &&
										((typeof data === "object" && data !== null) ||
											typeof data === "function")
								) ?
									clone(data)
								:	data
							)
						}
						const ctx = new Traversal(data, this.$.resolvedConfig)
						this.traverseApply(data, ctx)
						return ctx.finalize(onFail)
					}
				case "branchedOptimistic":
					return this.createBranchedOptimisticRootApply()
				default:
					this.rootApplyStrategy
					return throwInternalError(
						`Unexpected rootApplyStrategy ${this.rootApplyStrategy}`
					)
			}
		}
		compiledMeta = compileMeta(this.metaJson)
		cacheGetter(name, value2) {
			Object.defineProperty(this, name, { value: value2 })
			return value2
		}
		get description() {
			return this.cacheGetter(
				"description",
				this.meta?.description ??
					this.$.resolvedConfig[this.kind].description(this)
			)
		}
		// we don't cache this currently since it can be updated once a scope finishes
		// resolving cyclic references, although it may be possible to ensure it is cached safely
		get references() {
			return Object.values(this.referencesById)
		}
		precedence = precedenceOfKind(this.kind)
		precompilation
		// defined as an arrow function since it is often detached, e.g. when passing to tRPC
		// otherwise, would run into issues with this binding
		assert = (data, pipedFromCtx) =>
			this(data, pipedFromCtx, errors => errors.throw())
		traverse(data, pipedFromCtx) {
			return this(data, pipedFromCtx, null)
		}
		get in() {
			return this.cacheGetter("in", this.getIo("in"))
		}
		get out() {
			return this.cacheGetter("out", this.getIo("out"))
		}
		// Should be refactored to use transform
		// https://github.com/arktypeio/arktype/issues/1020
		getIo(ioKind) {
			if (!this.includesTransform) return this
			const ioInner = {}
			for (const [k, v] of this.innerEntries) {
				const keySchemaImplementation = this.impl.keys[k]
				if (keySchemaImplementation.reduceIo)
					keySchemaImplementation.reduceIo(ioKind, ioInner, v)
				else if (keySchemaImplementation.child) {
					const childValue = v
					ioInner[k] =
						isArray(childValue) ?
							childValue.map(child => child[ioKind])
						:	childValue[ioKind]
				} else ioInner[k] = v
			}
			return this.$.node(this.kind, ioInner)
		}
		toJSON() {
			return this.json
		}
		toString() {
			return `Type<${this.expression}>`
		}
		equals(r) {
			const rNode = isNode(r) ? r : this.$.parseDefinition(r)
			return this.innerHash === rNode.innerHash
		}
		ifEquals(r) {
			return this.equals(r) ? this : void 0
		}
		hasKind(kind) {
			return this.kind === kind
		}
		assertHasKind(kind) {
			if (this.kind !== kind)
				throwError(`${this.kind} node was not of asserted kind ${kind}`)
			return this
		}
		hasKindIn(...kinds) {
			return kinds.includes(this.kind)
		}
		assertHasKindIn(...kinds) {
			if (!includes(kinds, this.kind))
				throwError(`${this.kind} node was not one of asserted kinds ${kinds}`)
			return this
		}
		isBasis() {
			return includes(basisKinds, this.kind)
		}
		isConstraint() {
			return includes(constraintKinds, this.kind)
		}
		isStructural() {
			return includes(structuralKinds, this.kind)
		}
		isRefinement() {
			return includes(refinementKinds, this.kind)
		}
		isRoot() {
			return includes(rootKinds, this.kind)
		}
		isUnknown() {
			return this.hasKind("intersection") && this.children.length === 0
		}
		isNever() {
			return this.hasKind("union") && this.children.length === 0
		}
		hasUnit(value2) {
			return this.hasKind("unit") && this.allows(value2)
		}
		hasOpenIntersection() {
			return this.impl.intersectionIsOpen
		}
		get nestableExpression() {
			return this.expression
		}
		select(selector) {
			const normalized = NodeSelector.normalize(selector)
			return this._select(normalized)
		}
		_select(selector) {
			let nodes =
				NodeSelector.applyBoundary[selector.boundary ?? "references"](this)
			if (selector.kind) nodes = nodes.filter(n => n.kind === selector.kind)
			if (selector.where) nodes = nodes.filter(selector.where)
			return NodeSelector.applyMethod[selector.method ?? "filter"](
				nodes,
				this,
				selector
			)
		}
		transform(mapper, opts) {
			return this._transform(mapper, this._createTransformContext(opts))
		}
		_createTransformContext(opts) {
			return {
				root: this,
				selected: void 0,
				seen: {},
				path: [],
				parseOptions: {
					prereduced: opts?.prereduced ?? false
				},
				undeclaredKeyHandling: void 0,
				...opts
			}
		}
		_transform(mapper, ctx) {
			const $ = ctx.bindScope ?? this.$
			if (ctx.seen[this.id]) return this.$.lazilyResolve(ctx.seen[this.id])
			if (ctx.shouldTransform?.(this, ctx) === false) return this
			let transformedNode
			ctx.seen[this.id] = () => transformedNode
			if (
				this.hasKind("structure") &&
				this.undeclared !== ctx.undeclaredKeyHandling
			) {
				ctx = {
					...ctx,
					undeclaredKeyHandling: this.undeclared
				}
			}
			const innerWithTransformedChildren = flatMorph(this.inner, (k, v) => {
				if (!this.impl.keys[k].child) return [k, v]
				const children = v
				if (!isArray(children)) {
					const transformed2 = children._transform(mapper, ctx)
					return transformed2 ? [k, transformed2] : []
				}
				if (children.length === 0) return [k, v]
				const transformed = children.flatMap(n => {
					const transformedChild = n._transform(mapper, ctx)
					return transformedChild ?? []
				})
				return transformed.length ? [k, transformed] : []
			})
			delete ctx.seen[this.id]
			const innerWithMeta = Object.assign(innerWithTransformedChildren, {
				meta: this.meta
			})
			const transformedInner =
				ctx.selected && !ctx.selected.includes(this) ?
					innerWithMeta
				:	mapper(this.kind, innerWithMeta, ctx)
			if (transformedInner === null) return null
			if (isNode(transformedInner)) return (transformedNode = transformedInner)
			const transformedKeys = Object.keys(transformedInner)
			const hasNoTypedKeys =
				transformedKeys.length === 0 ||
				(transformedKeys.length === 1 && transformedKeys[0] === "meta")
			if (
				hasNoTypedKeys && // if inner was previously an empty object (e.g. unknown) ensure it is not pruned
				!isEmptyObject(this.inner)
			)
				return null
			if (
				(this.kind === "required" ||
					this.kind === "optional" ||
					this.kind === "index") &&
				!("value" in transformedInner)
			) {
				return ctx.undeclaredKeyHandling ?
						{ ...transformedInner, value: $ark.intrinsic.unknown }
					:	null
			}
			if (this.kind === "morph") {
				transformedInner.in ??= $ark.intrinsic.unknown
			}
			return (transformedNode = $.node(
				this.kind,
				transformedInner,
				ctx.parseOptions
			))
		}
		configureReferences(meta, selector = "references") {
			const normalized = NodeSelector.normalize(selector)
			const mapper =
				typeof meta === "string" ?
					(kind, inner) => ({
						...inner,
						meta: { ...inner.meta, description: meta }
					})
				: typeof meta === "function" ?
					(kind, inner) => ({ ...inner, meta: meta(inner.meta) })
				:	(kind, inner) => ({
						...inner,
						meta: { ...inner.meta, ...meta }
					})
			if (normalized.boundary === "self") {
				return this.$.node(
					this.kind,
					mapper(this.kind, { ...this.inner, meta: this.meta })
				)
			}
			const rawSelected = this._select(normalized)
			const selected = rawSelected && liftArray(rawSelected)
			const shouldTransform =
				normalized.boundary === "child" ?
					(node2, ctx) => ctx.root.children.includes(node2)
				: normalized.boundary === "shallow" ?
					node2 => node2.kind !== "structure"
				:	() => true
			return this.$.finalize(
				this.transform(mapper, {
					shouldTransform,
					selected
				})
			)
		}
	}
	var NodeSelector = {
		applyBoundary: {
			self: node2 => [node2],
			child: node2 => [...node2.children],
			shallow: node2 => [...node2.shallowReferences],
			references: node2 => [...node2.references]
		},
		applyMethod: {
			filter: nodes => nodes,
			assertFilter: (nodes, from, selector) => {
				if (nodes.length === 0)
					throwError(writeSelectAssertionMessage(from, selector))
				return nodes
			},
			find: nodes => nodes[0],
			assertFind: (nodes, from, selector) => {
				if (nodes.length === 0)
					throwError(writeSelectAssertionMessage(from, selector))
				return nodes[0]
			}
		},
		normalize: selector =>
			typeof selector === "function" ?
				{ boundary: "references", method: "filter", where: selector }
			: typeof selector === "string" ?
				isKeyOf(selector, NodeSelector.applyBoundary) ?
					{ method: "filter", boundary: selector }
				:	{ boundary: "references", method: "filter", kind: selector }
			:	{ boundary: "references", method: "filter", ...selector }
	}
	var writeSelectAssertionMessage = (from, selector) =>
		`${from} had no references matching ${printable(selector)}.`
	var typePathToPropString = path =>
		stringifyPath(path, {
			stringifyNonKey: node2 => node2.expression
		})
	var referenceMatcher = /"(\$ark\.[^"]+)"/g
	var compileMeta = metaJson =>
		JSON.stringify(metaJson).replaceAll(referenceMatcher, "$1")
	var flatRef = (path, node2) => ({
		path,
		node: node2,
		propString: typePathToPropString(path)
	})
	var flatRefsAreEqual = (l, r) =>
		l.propString === r.propString && l.node.equals(r.node)
	var appendUniqueFlatRefs = (existing, refs) =>
		appendUnique(existing, refs, {
			isEqual: flatRefsAreEqual
		})
	var appendUniqueNodes = (existing, refs) =>
		appendUnique(existing, refs, {
			isEqual: (l, r) => l.equals(r)
		})

	// ../schema/out/shared/disjoint.js
	var Disjoint = class _Disjoint extends Array {
		static init(kind, l, r, ctx) {
			return new _Disjoint({
				kind,
				l,
				r,
				path: ctx?.path ?? [],
				optional: ctx?.optional ?? false
			})
		}
		add(kind, l, r, ctx) {
			this.push({
				kind,
				l,
				r,
				path: ctx?.path ?? [],
				optional: ctx?.optional ?? false
			})
			return this
		}
		get summary() {
			return this.describeReasons()
		}
		describeReasons() {
			if (this.length === 1) {
				const { path, l, r } = this[0]
				const pathString = stringifyPath(path)
				return writeUnsatisfiableExpressionError(
					`Intersection${pathString && ` at ${pathString}`} of ${describeReasons(l, r)}`
				)
			}
			return `The following intersections result in unsatisfiable types:
\u2022 ${this.map(({ path, l, r }) => `${path}: ${describeReasons(l, r)}`).join("\n\u2022 ")}`
		}
		throw() {
			return throwParseError(this.describeReasons())
		}
		invert() {
			const result = this.map(entry => ({
				...entry,
				l: entry.r,
				r: entry.l
			}))
			if (!(result instanceof _Disjoint)) return new _Disjoint(...result)
			return result
		}
		withPrefixKey(key, kind) {
			return this.map(entry => ({
				...entry,
				path: [key, ...entry.path],
				optional: entry.optional || kind === "optional"
			}))
		}
		toNeverIfDisjoint() {
			return $ark.intrinsic.never
		}
	}
	var describeReasons = (l, r) =>
		`${describeReason(l)} and ${describeReason(r)}`
	var describeReason = value2 =>
		isNode(value2) ? value2.expression
		: isArray(value2) ? value2.map(describeReason).join(" | ") || "never"
		: String(value2)
	var writeUnsatisfiableExpressionError = expression =>
		`${expression} results in an unsatisfiable type`

	// ../schema/out/shared/intersections.js
	var intersectionCache = {}
	var intersectNodesRoot = (l, r, $) =>
		intersectOrPipeNodes(l, r, {
			$,
			invert: false,
			pipe: false
		})
	var pipeNodesRoot = (l, r, $) =>
		intersectOrPipeNodes(l, r, {
			$,
			invert: false,
			pipe: true
		})
	var intersectOrPipeNodes = (l, r, ctx) => {
		const operator = ctx.pipe ? "|>" : "&"
		const lrCacheKey = `${l.hash}${operator}${r.hash}`
		if (intersectionCache[lrCacheKey] !== void 0)
			return intersectionCache[lrCacheKey]
		if (!ctx.pipe) {
			const rlCacheKey = `${r.hash}${operator}${l.hash}`
			if (intersectionCache[rlCacheKey] !== void 0) {
				const rlResult = intersectionCache[rlCacheKey]
				const lrResult =
					rlResult instanceof Disjoint ? rlResult.invert() : rlResult
				intersectionCache[lrCacheKey] = lrResult
				return lrResult
			}
		}
		const isPureIntersection =
			!ctx.pipe || (!l.includesTransform && !r.includesTransform)
		if (isPureIntersection && l.equals(r)) return l
		let result =
			isPureIntersection ? _intersectNodes(l, r, ctx)
			: l.hasKindIn(...rootKinds) ?
				// if l is a RootNode, r will be as well
				_pipeNodes(l, r, ctx)
			:	_intersectNodes(l, r, ctx)
		if (isNode(result)) {
			if (l.equals(result)) result = l
			else if (r.equals(result)) result = r
		}
		intersectionCache[lrCacheKey] = result
		return result
	}
	var _intersectNodes = (l, r, ctx) => {
		const leftmostKind = l.precedence < r.precedence ? l.kind : r.kind
		const implementation23 =
			l.impl.intersections[r.kind] ?? r.impl.intersections[l.kind]
		if (implementation23 === void 0) {
			return null
		} else if (leftmostKind === l.kind) return implementation23(l, r, ctx)
		else {
			let result = implementation23(r, l, { ...ctx, invert: !ctx.invert })
			if (result instanceof Disjoint) result = result.invert()
			return result
		}
	}
	var _pipeNodes = (l, r, ctx) =>
		l.includesTransform || r.includesTransform ?
			ctx.invert ?
				pipeMorphed(r, l, ctx)
			:	pipeMorphed(l, r, ctx)
		:	_intersectNodes(l, r, ctx)
	var pipeMorphed = (from, to, ctx) =>
		from.distribute(
			fromBranch => _pipeMorphed(fromBranch, to, ctx),
			results => {
				const viableBranches = results.filter(isNode)
				if (viableBranches.length === 0)
					return Disjoint.init("union", from.branches, to.branches)
				if (
					viableBranches.length < from.branches.length ||
					!from.branches.every((branch, i) =>
						branch.in.equals(viableBranches[i].in)
					)
				)
					return ctx.$.parseSchema(viableBranches)
				let meta
				if (viableBranches.length === 1) {
					const onlyBranch = viableBranches[0]
					if (!meta) return onlyBranch
					return ctx.$.node("morph", {
						...onlyBranch.inner,
						in: onlyBranch.in.configure(meta, "self")
					})
				}
				const schema2 = {
					branches: viableBranches
				}
				if (meta) schema2.meta = meta
				return ctx.$.parseSchema(schema2)
			}
		)
	var _pipeMorphed = (from, to, ctx) => {
		const fromIsMorph = from.hasKind("morph")
		if (fromIsMorph) {
			const morphs = [...from.morphs]
			if (from.lastMorphIfNode) {
				const outIntersection = intersectOrPipeNodes(
					from.lastMorphIfNode,
					to,
					ctx
				)
				if (outIntersection instanceof Disjoint) return outIntersection
				morphs[morphs.length - 1] = outIntersection
			} else morphs.push(to)
			return ctx.$.node("morph", {
				morphs,
				in: from.inner.in
			})
		}
		if (to.hasKind("morph")) {
			const inTersection = intersectOrPipeNodes(from, to.in, ctx)
			if (inTersection instanceof Disjoint) return inTersection
			return ctx.$.node("morph", {
				morphs: [to],
				in: inTersection
			})
		}
		return ctx.$.node("morph", {
			morphs: [to],
			in: from
		})
	}

	// ../schema/out/constraint.js
	var BaseConstraint = class extends BaseNode {
		constructor(attachments, $) {
			super(attachments, $)
			Object.defineProperty(this, arkKind, {
				value: "constraint",
				enumerable: false
			})
		}
		impliedSiblings
		intersect(r) {
			return intersectNodesRoot(this, r, this.$)
		}
	}
	var InternalPrimitiveConstraint = class extends BaseConstraint {
		traverseApply = (data, ctx) => {
			if (!this.traverseAllows(data, ctx))
				ctx.errorFromNodeContext(this.errorContext)
		}
		compile(js) {
			if (js.traversalKind === "Allows") js.return(this.compiledCondition)
			else {
				js.if(this.compiledNegation, () =>
					js.line(
						`${js.ctx}.errorFromNodeContext(${this.compiledErrorContext})`
					)
				)
			}
		}
		get errorContext() {
			return {
				code: this.kind,
				description: this.description,
				meta: this.meta,
				...this.inner
			}
		}
		get compiledErrorContext() {
			return compileObjectLiteral(this.errorContext)
		}
	}
	var constraintKeyParser = kind => (schema2, ctx) => {
		if (isArray(schema2)) {
			if (schema2.length === 0) {
				return
			}
			const nodes = schema2.map(schema3 => ctx.$.node(kind, schema3))
			if (kind === "predicate") return nodes
			return nodes.sort((l, r) => (l.hash < r.hash ? -1 : 1))
		}
		const child = ctx.$.node(kind, schema2)
		return child.hasOpenIntersection() ? [child] : child
	}
	var intersectConstraints = s => {
		const head = s.r.shift()
		if (!head) {
			let result =
				s.l.length === 0 && s.kind === "structure" ?
					$ark.intrinsic.unknown.internal
				:	s.ctx.$.node(
						s.kind,
						Object.assign(s.baseInner, unflattenConstraints(s.l)),
						{ prereduced: true }
					)
			for (const root of s.roots) {
				if (result instanceof Disjoint) return result
				result = intersectOrPipeNodes(root, result, s.ctx)
			}
			return result
		}
		let matched = false
		for (let i = 0; i < s.l.length; i++) {
			const result = intersectOrPipeNodes(s.l[i], head, s.ctx)
			if (result === null) continue
			if (result instanceof Disjoint) return result
			if (!matched) {
				if (result.isRoot()) {
					s.roots.push(result)
					s.l.splice(i)
					return intersectConstraints(s)
				}
				s.l[i] = result
				matched = true
			} else if (!s.l.includes(result)) {
				return throwInternalError(
					`Unexpectedly encountered multiple distinct intersection results for refinement ${result}`
				)
			}
		}
		if (!matched) s.l.push(head)
		if (s.kind === "intersection")
			head.impliedSiblings?.forEach(node2 => appendUnique(s.r, node2))
		return intersectConstraints(s)
	}
	var flattenConstraints = inner => {
		const result = Object.entries(inner)
			.flatMap(([k, v]) => (k in constraintKeys ? v : []))
			.sort((l, r) =>
				l.precedence < r.precedence ? -1
				: l.precedence > r.precedence ? 1
				: l.kind === "predicate" && r.kind === "predicate" ? 0
				: l.hash < r.hash ? -1
				: 1
			)
		return result
	}
	var unflattenConstraints = constraints => {
		const inner = {}
		for (const constraint of constraints) {
			if (constraint.hasOpenIntersection()) {
				inner[constraint.kind] = append(inner[constraint.kind], constraint)
			} else {
				if (inner[constraint.kind]) {
					return throwInternalError(
						`Unexpected intersection of closed refinements of kind ${constraint.kind}`
					)
				}
				inner[constraint.kind] = constraint
			}
		}
		return inner
	}
	var throwInvalidOperandError = (...args2) =>
		throwParseError(writeInvalidOperandMessage(...args2))
	var writeInvalidOperandMessage = (kind, expected, actual) => {
		const actualDescription =
			actual.hasKind("morph") ? "a morph"
			: actual.isUnknown() ? "unknown"
			: actual.exclude(expected).defaultShortDescription
		return `${capitalize(kind)} operand must be ${expected.description} (was ${actualDescription})`
	}

	// ../schema/out/generic.js
	var parseGeneric = (paramDefs, bodyDef, $) =>
		new GenericRoot(paramDefs, bodyDef, $, $, null)
	var LazyGenericBody = class extends Callable {}
	var GenericRoot = class extends Callable {
		[arkKind] = "generic"
		paramDefs
		bodyDef
		$
		arg$
		baseInstantiation
		hkt
		description
		constructor(paramDefs, bodyDef, $, arg$, hkt) {
			super((...args2) => {
				const argNodes = flatMorph(this.names, (i, name) => {
					const arg = this.arg$.parse(args2[i])
					if (!arg.extends(this.constraints[i])) {
						throwParseError(
							writeUnsatisfiedParameterConstraintMessage(
								name,
								this.constraints[i].expression,
								arg.expression
							)
						)
					}
					return [name, arg]
				})
				if (this.defIsLazy()) {
					const def = this.bodyDef(argNodes)
					return this.$.parse(def)
				}
				return this.$.parse(bodyDef, { args: argNodes })
			})
			this.paramDefs = paramDefs
			this.bodyDef = bodyDef
			this.$ = $
			this.arg$ = arg$
			this.hkt = hkt
			this.description =
				hkt ?
					(new hkt().description ??
					`a generic type for ${hkt.constructor.name}`)
				:	"a generic type"
			this.baseInstantiation = this(...this.constraints)
		}
		defIsLazy() {
			return this.bodyDef instanceof LazyGenericBody
		}
		cacheGetter(name, value2) {
			Object.defineProperty(this, name, { value: value2 })
			return value2
		}
		get json() {
			return this.cacheGetter("json", {
				params: this.params.map(param =>
					param[1].isUnknown() ? param[0] : [param[0], param[1].json]
				),
				body: snapshot(this.bodyDef)
			})
		}
		get params() {
			return this.cacheGetter(
				"params",
				this.paramDefs.map(param =>
					typeof param === "string" ?
						[param, $ark.intrinsic.unknown]
					:	[param[0], this.$.parse(param[1])]
				)
			)
		}
		get names() {
			return this.cacheGetter(
				"names",
				this.params.map(e => e[0])
			)
		}
		get constraints() {
			return this.cacheGetter(
				"constraints",
				this.params.map(e => e[1])
			)
		}
		get internal() {
			return this
		}
		get referencesById() {
			return this.baseInstantiation.internal.referencesById
		}
		get references() {
			return this.baseInstantiation.internal.references
		}
	}
	var writeUnsatisfiedParameterConstraintMessage = (name, constraint, arg) =>
		`${name} must be assignable to ${constraint} (was ${arg})`

	// ../schema/out/shared/jsonSchema.js
	var unjsonifiableExplanations = {
		morph:
			"it represents a transformation, while JSON Schema only allows validation. Consider creating a Schema from one of its endpoints using `.in` or `.out`.",
		cyclic:
			"cyclic types are not yet convertible to JSON Schema. If this feature is important to you, please add your feedback at https://github.com/arktypeio/arktype/issues/1087"
	}
	var writeUnjsonifiableMessage = (description, explanation) => {
		let message = `${description} is not convertible to JSON Schema`
		if (explanation) {
			const normalizedExplanation =
				isKeyOf(explanation, unjsonifiableExplanations) ?
					unjsonifiableExplanations[explanation]
				:	explanation
			message += ` because ${normalizedExplanation}`
		}
		return message
	}
	var JsonSchema = {
		writeUnjsonifiableMessage,
		UnjsonifiableError: class UnjsonifiableError extends Error {},
		throwUnjsonifiableError: (...args2) =>
			throwError(writeUnjsonifiableMessage(...args2)),
		throwInternalOperandError: (kind, schema2) =>
			throwInternalError(
				`Unexpected JSON Schema input for ${kind}: ${printable(schema2)}`
			)
	}

	// ../schema/out/predicate.js
	var implementation = implementNode({
		kind: "predicate",
		hasAssociatedError: true,
		collapsibleKey: "predicate",
		keys: {
			predicate: {}
		},
		normalize: schema2 =>
			typeof schema2 === "function" ? { predicate: schema2 } : schema2,
		defaults: {
			description: node2 =>
				`valid according to ${node2.predicate.name || "an anonymous predicate"}`
		},
		intersectionIsOpen: true,
		intersections: {
			// as long as the narrows in l and r are individually safe to check
			// in the order they're specified, checking them in the order
			// resulting from this intersection should also be safe.
			predicate: () => null
		}
	})
	var PredicateNode = class extends BaseConstraint {
		serializedPredicate = registeredReference(this.predicate)
		compiledCondition = `${this.serializedPredicate}(data, ctx)`
		compiledNegation = `!${this.compiledCondition}`
		impliedBasis = null
		expression = this.serializedPredicate
		traverseAllows = this.predicate
		errorContext = {
			code: "predicate",
			description: this.description,
			meta: this.meta
		}
		compiledErrorContext = compileObjectLiteral(this.errorContext)
		traverseApply = (data, ctx) => {
			if (!this.predicate(data, ctx.external) && !ctx.hasError())
				ctx.errorFromNodeContext(this.errorContext)
		}
		compile(js) {
			if (js.traversalKind === "Allows") {
				js.return(this.compiledCondition)
				return
			}
			js.if(`${this.compiledNegation} && !ctx.hasError()`, () =>
				js.line(`ctx.errorFromNodeContext(${this.compiledErrorContext})`)
			)
		}
		reduceJsonSchema() {
			return JsonSchema.throwUnjsonifiableError(`Predicate ${this.expression}`)
		}
	}
	var Predicate = {
		implementation,
		Node: PredicateNode
	}

	// ../schema/out/refinements/divisor.js
	var implementation2 = implementNode({
		kind: "divisor",
		collapsibleKey: "rule",
		keys: {
			rule: {}
		},
		normalize: schema2 =>
			typeof schema2 === "number" ? { rule: schema2 } : schema2,
		hasAssociatedError: true,
		defaults: {
			description: node2 =>
				node2.rule === 1 ? "an integer"
				: node2.rule === 2 ? "even"
				: `a multiple of ${node2.rule}`
		},
		intersections: {
			divisor: (l, r, ctx) =>
				ctx.$.node("divisor", {
					rule: Math.abs(
						(l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule)
					)
				})
		},
		obviatesBasisDescription: true
	})
	var DivisorNode = class extends InternalPrimitiveConstraint {
		traverseAllows = data => data % this.rule === 0
		compiledCondition = `data % ${this.rule} === 0`
		compiledNegation = `data % ${this.rule} !== 0`
		impliedBasis = $ark.intrinsic.number.internal
		expression = `% ${this.rule}`
		reduceJsonSchema(schema2) {
			schema2.type = "integer"
			if (this.rule === 1) return schema2
			schema2.multipleOf = this.rule
			return schema2
		}
	}
	var Divisor = {
		implementation: implementation2,
		Node: DivisorNode
	}
	var greatestCommonDivisor = (l, r) => {
		let previous
		let greatestCommonDivisor2 = l
		let current = r
		while (current !== 0) {
			previous = current
			current = greatestCommonDivisor2 % current
			greatestCommonDivisor2 = previous
		}
		return greatestCommonDivisor2
	}

	// ../schema/out/refinements/range.js
	var BaseRange = class extends InternalPrimitiveConstraint {
		boundOperandKind = operandKindsByBoundKind[this.kind]
		compiledActual =
			this.boundOperandKind === "value" ? `data`
			: this.boundOperandKind === "length" ? `data.length`
			: `data.valueOf()`
		comparator = compileComparator(this.kind, this.exclusive)
		numericLimit = this.rule.valueOf()
		expression = `${this.comparator} ${this.rule}`
		compiledCondition = `${this.compiledActual} ${this.comparator} ${this.numericLimit}`
		compiledNegation = `${this.compiledActual} ${negatedComparators[this.comparator]} ${this.numericLimit}`
		// we need to compute stringLimit before errorContext, which references it
		// transitively through description for date bounds
		stringLimit =
			this.boundOperandKind === "date" ?
				dateLimitToString(this.numericLimit)
			:	`${this.numericLimit}`
		limitKind = this.comparator["0"] === "<" ? "upper" : "lower"
		isStricterThan(r) {
			const thisLimitIsStricter =
				this.limitKind === "upper" ?
					this.numericLimit < r.numericLimit
				:	this.numericLimit > r.numericLimit
			return (
				thisLimitIsStricter ||
				(this.numericLimit === r.numericLimit &&
					this.exclusive === true &&
					!r.exclusive)
			)
		}
		overlapsRange(r) {
			if (this.isStricterThan(r)) return false
			if (
				this.numericLimit === r.numericLimit &&
				(this.exclusive || r.exclusive)
			)
				return false
			return true
		}
		overlapIsUnit(r) {
			return (
				this.numericLimit === r.numericLimit && !this.exclusive && !r.exclusive
			)
		}
	}
	var negatedComparators = {
		"<": ">=",
		"<=": ">",
		">": "<=",
		">=": "<"
	}
	var boundKindPairsByLower = {
		min: "max",
		minLength: "maxLength",
		after: "before"
	}
	var parseExclusiveKey = {
		// omit key with value false since it is the default
		parse: flag => flag || void 0
	}
	var createLengthSchemaNormalizer = kind => schema2 => {
		if (typeof schema2 === "number") return { rule: schema2 }
		const { exclusive, ...normalized } = schema2
		return exclusive ?
				{
					...normalized,
					rule: kind === "minLength" ? normalized.rule + 1 : normalized.rule - 1
				}
			:	normalized
	}
	var createDateSchemaNormalizer = kind => schema2 => {
		if (
			typeof schema2 === "number" ||
			typeof schema2 === "string" ||
			schema2 instanceof Date
		)
			return { rule: schema2 }
		const { exclusive, ...normalized } = schema2
		if (!exclusive) return normalized
		const numericLimit =
			typeof normalized.rule === "number" ? normalized.rule
			: typeof normalized.rule === "string" ?
				new Date(normalized.rule).valueOf()
			:	normalized.rule.valueOf()
		return exclusive ?
				{
					...normalized,
					rule: kind === "after" ? numericLimit + 1 : numericLimit - 1
				}
			:	normalized
	}
	var parseDateLimit = limit =>
		typeof limit === "string" || typeof limit === "number" ?
			new Date(limit)
		:	limit
	var writeInvalidLengthBoundMessage = (kind, limit) =>
		`${kind} bound must be a positive integer (was ${limit})`
	var createLengthRuleParser = kind => limit => {
		if (!Number.isInteger(limit) || limit < 0)
			throwParseError(writeInvalidLengthBoundMessage(kind, limit))
		return limit
	}
	var operandKindsByBoundKind = {
		min: "value",
		max: "value",
		minLength: "length",
		maxLength: "length",
		after: "date",
		before: "date"
	}
	var compileComparator = (kind, exclusive) =>
		`${isKeyOf(kind, boundKindPairsByLower) ? ">" : "<"}${exclusive ? "" : "="}`
	var dateLimitToString = limit =>
		typeof limit === "string" ? limit : new Date(limit).toLocaleString()
	var writeUnboundableMessage = root =>
		`Bounded expression ${root} must be exactly one of number, string, Array, or Date`

	// ../schema/out/refinements/after.js
	var implementation3 = implementNode({
		kind: "after",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {
				parse: parseDateLimit,
				serialize: schema2 => schema2.toISOString()
			}
		},
		normalize: createDateSchemaNormalizer("after"),
		defaults: {
			description: node2 => `${node2.collapsibleLimitString} or later`,
			actual: describeCollapsibleDate
		},
		intersections: {
			after: (l, r) => (l.isStricterThan(r) ? l : r)
		}
	})
	var AfterNode = class extends BaseRange {
		impliedBasis = $ark.intrinsic.Date.internal
		collapsibleLimitString = describeCollapsibleDate(this.rule)
		traverseAllows = data => data >= this.rule
		reduceJsonSchema() {
			return JsonSchema.throwUnjsonifiableError("Date instance")
		}
	}
	var After = {
		implementation: implementation3,
		Node: AfterNode
	}

	// ../schema/out/refinements/before.js
	var implementation4 = implementNode({
		kind: "before",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {
				parse: parseDateLimit,
				serialize: schema2 => schema2.toISOString()
			}
		},
		normalize: createDateSchemaNormalizer("before"),
		defaults: {
			description: node2 => `${node2.collapsibleLimitString} or earlier`,
			actual: describeCollapsibleDate
		},
		intersections: {
			before: (l, r) => (l.isStricterThan(r) ? l : r),
			after: (before, after, ctx) =>
				before.overlapsRange(after) ?
					before.overlapIsUnit(after) ?
						ctx.$.node("unit", { unit: before.rule })
					:	null
				:	Disjoint.init("range", before, after)
		}
	})
	var BeforeNode = class extends BaseRange {
		collapsibleLimitString = describeCollapsibleDate(this.rule)
		traverseAllows = data => data <= this.rule
		impliedBasis = $ark.intrinsic.Date.internal
		reduceJsonSchema() {
			return JsonSchema.throwUnjsonifiableError("Date instance")
		}
	}
	var Before = {
		implementation: implementation4,
		Node: BeforeNode
	}

	// ../schema/out/refinements/exactLength.js
	var implementation5 = implementNode({
		kind: "exactLength",
		collapsibleKey: "rule",
		keys: {
			rule: {
				parse: createLengthRuleParser("exactLength")
			}
		},
		normalize: schema2 =>
			typeof schema2 === "number" ? { rule: schema2 } : schema2,
		hasAssociatedError: true,
		defaults: {
			description: node2 => `exactly length ${node2.rule}`,
			actual: data => `${data.length}`
		},
		intersections: {
			exactLength: (l, r, ctx) =>
				Disjoint.init(
					"unit",
					ctx.$.node("unit", { unit: l.rule }),
					ctx.$.node("unit", { unit: r.rule }),
					{ path: ["length"] }
				),
			minLength: (exactLength, minLength) =>
				exactLength.rule >= minLength.rule ?
					exactLength
				:	Disjoint.init("range", exactLength, minLength),
			maxLength: (exactLength, maxLength) =>
				exactLength.rule <= maxLength.rule ?
					exactLength
				:	Disjoint.init("range", exactLength, maxLength)
		}
	})
	var ExactLengthNode = class extends InternalPrimitiveConstraint {
		traverseAllows = data => data.length === this.rule
		compiledCondition = `data.length === ${this.rule}`
		compiledNegation = `data.length !== ${this.rule}`
		impliedBasis = $ark.intrinsic.lengthBoundable.internal
		expression = `== ${this.rule}`
		reduceJsonSchema(schema2) {
			switch (schema2.type) {
				case "string":
					schema2.minLength = this.rule
					schema2.maxLength = this.rule
					return schema2
				case "array":
					schema2.minItems = this.rule
					schema2.maxItems = this.rule
					return schema2
				default:
					return JsonSchema.throwInternalOperandError("exactLength", schema2)
			}
		}
	}
	var ExactLength = {
		implementation: implementation5,
		Node: ExactLengthNode
	}

	// ../schema/out/refinements/max.js
	var implementation6 = implementNode({
		kind: "max",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {},
			exclusive: parseExclusiveKey
		},
		normalize: schema2 =>
			typeof schema2 === "number" ? { rule: schema2 } : schema2,
		defaults: {
			description: node2 => {
				if (node2.rule === 0)
					return node2.exclusive ? "negative" : "non-positive"
				return `${node2.exclusive ? "less than" : "at most"} ${node2.rule}`
			}
		},
		intersections: {
			max: (l, r) => (l.isStricterThan(r) ? l : r),
			min: (max, min, ctx) =>
				max.overlapsRange(min) ?
					max.overlapIsUnit(min) ?
						ctx.$.node("unit", { unit: max.rule })
					:	null
				:	Disjoint.init("range", max, min)
		},
		obviatesBasisDescription: true
	})
	var MaxNode = class extends BaseRange {
		impliedBasis = $ark.intrinsic.number.internal
		traverseAllows =
			this.exclusive ? data => data < this.rule : data => data <= this.rule
		reduceJsonSchema(schema2) {
			if (this.exclusive) schema2.exclusiveMaximum = this.rule
			else schema2.maximum = this.rule
			return schema2
		}
	}
	var Max = {
		implementation: implementation6,
		Node: MaxNode
	}

	// ../schema/out/refinements/maxLength.js
	var implementation7 = implementNode({
		kind: "maxLength",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {
				parse: createLengthRuleParser("maxLength")
			}
		},
		reduce: (inner, $) =>
			inner.rule === 0 ? $.node("exactLength", inner) : void 0,
		normalize: createLengthSchemaNormalizer("maxLength"),
		defaults: {
			description: node2 => `at most length ${node2.rule}`,
			actual: data => `${data.length}`
		},
		intersections: {
			maxLength: (l, r) => (l.isStricterThan(r) ? l : r),
			minLength: (max, min, ctx) =>
				max.overlapsRange(min) ?
					max.overlapIsUnit(min) ?
						ctx.$.node("exactLength", { rule: max.rule })
					:	null
				:	Disjoint.init("range", max, min)
		}
	})
	var MaxLengthNode = class extends BaseRange {
		impliedBasis = $ark.intrinsic.lengthBoundable.internal
		traverseAllows = data => data.length <= this.rule
		reduceJsonSchema(schema2) {
			switch (schema2.type) {
				case "string":
					schema2.maxLength = this.rule
					return schema2
				case "array":
					schema2.maxItems = this.rule
					return schema2
				default:
					return JsonSchema.throwInternalOperandError("maxLength", schema2)
			}
		}
	}
	var MaxLength = {
		implementation: implementation7,
		Node: MaxLengthNode
	}

	// ../schema/out/refinements/min.js
	var implementation8 = implementNode({
		kind: "min",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {},
			exclusive: parseExclusiveKey
		},
		normalize: schema2 =>
			typeof schema2 === "number" ? { rule: schema2 } : schema2,
		defaults: {
			description: node2 => {
				if (node2.rule === 0)
					return node2.exclusive ? "positive" : "non-negative"
				return `${node2.exclusive ? "more than" : "at least"} ${node2.rule}`
			}
		},
		intersections: {
			min: (l, r) => (l.isStricterThan(r) ? l : r)
		},
		obviatesBasisDescription: true
	})
	var MinNode = class extends BaseRange {
		impliedBasis = $ark.intrinsic.number.internal
		traverseAllows =
			this.exclusive ? data => data > this.rule : data => data >= this.rule
		reduceJsonSchema(schema2) {
			if (this.exclusive) schema2.exclusiveMinimum = this.rule
			else schema2.minimum = this.rule
			return schema2
		}
	}
	var Min = {
		implementation: implementation8,
		Node: MinNode
	}

	// ../schema/out/refinements/minLength.js
	var implementation9 = implementNode({
		kind: "minLength",
		collapsibleKey: "rule",
		hasAssociatedError: true,
		keys: {
			rule: {
				parse: createLengthRuleParser("minLength")
			}
		},
		reduce: inner =>
			inner.rule === 0 ?
				// a minimum length of zero is trivially satisfied
				$ark.intrinsic.unknown
			:	void 0,
		normalize: createLengthSchemaNormalizer("minLength"),
		defaults: {
			description: node2 =>
				node2.rule === 1 ? "non-empty" : `at least length ${node2.rule}`,
			// avoid default message like "must be non-empty (was 0)"
			actual: data => (data.length === 0 ? "" : `${data.length}`)
		},
		intersections: {
			minLength: (l, r) => (l.isStricterThan(r) ? l : r)
		}
	})
	var MinLengthNode = class extends BaseRange {
		impliedBasis = $ark.intrinsic.lengthBoundable.internal
		traverseAllows = data => data.length >= this.rule
		reduceJsonSchema(schema2) {
			switch (schema2.type) {
				case "string":
					schema2.minLength = this.rule
					return schema2
				case "array":
					schema2.minItems = this.rule
					return schema2
				default:
					return JsonSchema.throwInternalOperandError("minLength", schema2)
			}
		}
	}
	var MinLength = {
		implementation: implementation9,
		Node: MinLengthNode
	}

	// ../schema/out/refinements/kinds.js
	var boundImplementationsByKind = {
		min: Min.implementation,
		max: Max.implementation,
		minLength: MinLength.implementation,
		maxLength: MaxLength.implementation,
		exactLength: ExactLength.implementation,
		after: After.implementation,
		before: Before.implementation
	}
	var boundClassesByKind = {
		min: Min.Node,
		max: Max.Node,
		minLength: MinLength.Node,
		maxLength: MaxLength.Node,
		exactLength: ExactLength.Node,
		after: After.Node,
		before: Before.Node
	}

	// ../schema/out/refinements/pattern.js
	var implementation10 = implementNode({
		kind: "pattern",
		collapsibleKey: "rule",
		keys: {
			rule: {},
			flags: {}
		},
		normalize: schema2 =>
			typeof schema2 === "string" ? { rule: schema2 }
			: schema2 instanceof RegExp ?
				schema2.flags ?
					{ rule: schema2.source, flags: schema2.flags }
				:	{ rule: schema2.source }
			:	schema2,
		obviatesBasisDescription: true,
		obviatesBasisExpression: true,
		hasAssociatedError: true,
		intersectionIsOpen: true,
		defaults: {
			description: node2 => `matched by ${node2.rule}`
		},
		intersections: {
			// for now, non-equal regex are naively intersected:
			// https://github.com/arktypeio/arktype/issues/853
			pattern: () => null
		}
	})
	var PatternNode = class extends InternalPrimitiveConstraint {
		instance = new RegExp(this.rule, this.flags)
		expression = `${this.instance}`
		traverseAllows = this.instance.test.bind(this.instance)
		compiledCondition = `${this.expression}.test(data)`
		compiledNegation = `!${this.compiledCondition}`
		impliedBasis = $ark.intrinsic.string.internal
		reduceJsonSchema(schema2) {
			if (schema2.pattern) {
				return JsonSchema.throwUnjsonifiableError(
					`Intersection of patterns ${schema2.pattern} & ${this.rule}`
				)
			}
			schema2.pattern = this.rule
			return schema2
		}
	}
	var Pattern = {
		implementation: implementation10,
		Node: PatternNode
	}

	// ../schema/out/parse.js
	var schemaKindOf = (schema2, allowedKinds) => {
		const kind = discriminateRootKind(schema2)
		if (allowedKinds && !allowedKinds.includes(kind)) {
			return throwParseError(
				`Root of kind ${kind} should be one of ${allowedKinds}`
			)
		}
		return kind
	}
	var discriminateRootKind = schema2 => {
		if (hasArkKind(schema2, "root")) return schema2.kind
		if (typeof schema2 === "string")
			return schema2[0] === "$" ? "alias" : "domain"
		if (typeof schema2 === "function") return "proto"
		if (typeof schema2 !== "object" || schema2 === null)
			return throwParseError(writeInvalidSchemaMessage(schema2))
		if ("morphs" in schema2) return "morph"
		if ("branches" in schema2 || isArray(schema2)) return "union"
		if ("unit" in schema2) return "unit"
		if ("reference" in schema2) return "alias"
		const schemaKeys = Object.keys(schema2)
		if (schemaKeys.length === 0 || schemaKeys.some(k => k in constraintKeys))
			return "intersection"
		if ("proto" in schema2) return "proto"
		if ("domain" in schema2) return "domain"
		return throwParseError(writeInvalidSchemaMessage(schema2))
	}
	var writeInvalidSchemaMessage = schema2 =>
		`${printable(schema2)} is not a valid type schema`
	var nodeCountsByPrefix = {}
	var serializeListableChild = listableNode =>
		isArray(listableNode) ?
			listableNode.map(node2 => node2.collapsibleJson)
		:	listableNode.collapsibleJson
	var nodesByRegisteredId = {}
	$ark.nodesByRegisteredId = nodesByRegisteredId
	var registerNodeId = prefix => {
		nodeCountsByPrefix[prefix] ??= 0
		return `${prefix}${++nodeCountsByPrefix[prefix]}`
	}
	var parseNode = ctx => {
		const impl = nodeImplementationsByKind[ctx.kind]
		const configuredSchema =
			impl.applyConfig?.(ctx.def, ctx.$.resolvedConfig) ?? ctx.def
		const inner = {}
		const { meta: metaSchema, ...innerSchema } = configuredSchema
		const meta =
			metaSchema === void 0 ? {}
			: typeof metaSchema === "string" ? { description: metaSchema }
			: metaSchema
		const innerSchemaEntries = entriesOf(innerSchema)
			.sort(([lKey], [rKey]) =>
				isNodeKind(lKey) ?
					isNodeKind(rKey) ? precedenceOfKind(lKey) - precedenceOfKind(rKey)
					:	1
				: isNodeKind(rKey) ? -1
				: lKey < rKey ? -1
				: 1
			)
			.filter(([k, v]) => {
				if (k.startsWith("meta.")) {
					const metaKey = k.slice(5)
					meta[metaKey] = v
					return false
				}
				return true
			})
		for (const entry of innerSchemaEntries) {
			const k = entry[0]
			const keyImpl = impl.keys[k]
			if (!keyImpl)
				return throwParseError(`Key ${k} is not valid on ${ctx.kind} schema`)
			const v = keyImpl.parse ? keyImpl.parse(entry[1], ctx) : entry[1]
			if (v !== unset && (v !== void 0 || keyImpl.preserveUndefined))
				inner[k] = v
		}
		if (impl.reduce && !ctx.prereduced) {
			const reduced = impl.reduce(inner, ctx.$)
			if (reduced) {
				if (reduced instanceof Disjoint) return reduced.throw()
				return withMeta(reduced, meta)
			}
		}
		const node2 = createNode({
			id: ctx.id,
			kind: ctx.kind,
			inner,
			meta,
			$: ctx.$
		})
		return node2
	}
	var createNode = ({ id, kind, inner, meta, $, ignoreCache }) => {
		const impl = nodeImplementationsByKind[kind]
		const innerEntries = entriesOf(inner)
		const children = []
		let innerJson = {}
		innerEntries.forEach(([k, v]) => {
			const keyImpl = impl.keys[k]
			const serialize =
				keyImpl.serialize ??
				(keyImpl.child ? serializeListableChild : defaultValueSerializer)
			innerJson[k] = serialize(v)
			if (keyImpl.child === true) {
				const listableNode = v
				if (isArray(listableNode)) children.push(...listableNode)
				else children.push(listableNode)
			} else if (typeof keyImpl.child === "function")
				children.push(...keyImpl.child(v))
		})
		if (impl.finalizeInnerJson) innerJson = impl.finalizeInnerJson(innerJson)
		let json3 = { ...innerJson }
		let metaJson = {}
		if (!isEmptyObject(meta)) {
			metaJson = flatMorph(meta, (k, v) => [
				k,
				k === "examples" ? v : defaultValueSerializer(v)
			])
			json3.meta = possiblyCollapse(metaJson, "description", true)
		}
		innerJson = possiblyCollapse(innerJson, impl.collapsibleKey, false)
		const innerHash = JSON.stringify({ kind, ...innerJson })
		json3 = possiblyCollapse(json3, impl.collapsibleKey, false)
		const collapsibleJson = possiblyCollapse(json3, impl.collapsibleKey, true)
		const hash = JSON.stringify({ kind, ...json3 })
		if ($.nodesByHash[hash] && !ignoreCache) return $.nodesByHash[hash]
		const attachments = {
			id,
			kind,
			impl,
			inner,
			innerEntries,
			innerJson,
			innerHash,
			meta,
			metaJson,
			json: json3,
			hash,
			collapsibleJson,
			children
		}
		if (kind !== "intersection") {
			for (const k in inner)
				if (k !== "in" && k !== "out") attachments[k] = inner[k]
		}
		const node2 = new nodeClassesByKind[kind](attachments, $)
		return ($.nodesByHash[hash] = node2)
	}
	var withId = (node2, id) => {
		if (node2.id === id) return node2
		if (isNode(nodesByRegisteredId[id]))
			throwInternalError(`Unexpected attempt to overwrite node id ${id}`)
		return createNode({
			id,
			kind: node2.kind,
			inner: node2.inner,
			meta: node2.meta,
			$: node2.$,
			ignoreCache: true
		})
	}
	var withMeta = (node2, meta, id) => {
		if (id && isNode(nodesByRegisteredId[id]))
			throwInternalError(`Unexpected attempt to overwrite node id ${id}`)
		return createNode({
			id: id ?? registerNodeId(meta.alias ?? node2.kind),
			kind: node2.kind,
			inner: node2.inner,
			meta,
			$: node2.$
		})
	}
	var possiblyCollapse = (json3, toKey, allowPrimitive) => {
		const collapsibleKeys = Object.keys(json3)
		if (collapsibleKeys.length === 1 && collapsibleKeys[0] === toKey) {
			const collapsed = json3[toKey]
			if (allowPrimitive) return collapsed
			if (
				// if the collapsed value is still an object
				hasDomain(collapsed, "object") && // and the JSON did not include any implied keys
				(Object.keys(collapsed).length === 1 || Array.isArray(collapsed))
			) {
				return collapsed
			}
		}
		return json3
	}

	// ../schema/out/structure/prop.js
	var intersectProps = (l, r, ctx) => {
		if (l.key !== r.key) return null
		const key = l.key
		let value2 = intersectOrPipeNodes(l.value, r.value, ctx)
		const kind = l.required || r.required ? "required" : "optional"
		if (value2 instanceof Disjoint) {
			if (kind === "optional") value2 = $ark.intrinsic.never.internal
			else {
				return value2.withPrefixKey(
					l.key,
					l.required && r.required ? "required" : "optional"
				)
			}
		}
		if (kind === "required") {
			return ctx.$.node("required", {
				key,
				value: value2
			})
		}
		const defaultIntersection =
			l.hasDefault() ?
				r.hasDefault() ?
					l.default === r.default ?
						l.default
					:	throwParseError(
							writeDefaultIntersectionMessage(l.default, r.default)
						)
				:	l.default
			: r.hasDefault() ? r.default
			: unset
		return ctx.$.node("optional", {
			key,
			value: value2,
			// unset is stripped during parsing
			default: defaultIntersection
		})
	}
	var BaseProp = class extends BaseConstraint {
		required = this.kind === "required"
		optional = this.kind === "optional"
		impliedBasis = $ark.intrinsic.object.internal
		serializedKey = compileSerializedValue(this.key)
		compiledKey = typeof this.key === "string" ? this.key : this.serializedKey
		flatRefs = append(
			this.value.flatRefs.map(ref =>
				flatRef([this.key, ...ref.path], ref.node)
			),
			flatRef([this.key], this.value)
		)
		_transform(mapper, ctx) {
			ctx.path.push(this.key)
			const result = super._transform(mapper, ctx)
			ctx.path.pop()
			return result
		}
		hasDefault() {
			return "default" in this.inner
		}
		traverseAllows = (data, ctx) => {
			if (this.key in data) {
				return traverseKey(
					this.key,
					() => this.value.traverseAllows(data[this.key], ctx),
					ctx
				)
			}
			return this.optional
		}
		traverseApply = (data, ctx) => {
			if (this.key in data) {
				traverseKey(
					this.key,
					() => this.value.traverseApply(data[this.key], ctx),
					ctx
				)
			} else if (this.hasKind("required"))
				ctx.errorFromNodeContext(this.errorContext)
		}
		compile(js) {
			js.if(`${this.serializedKey} in data`, () =>
				js.traverseKey(
					this.serializedKey,
					`data${js.prop(this.key)}`,
					this.value
				)
			)
			if (this.hasKind("required")) {
				js.else(() => {
					if (js.traversalKind === "Apply") {
						return js.line(
							`ctx.errorFromNodeContext(${this.compiledErrorContext})`
						)
					} else return js.return(false)
				})
			}
			if (js.traversalKind === "Allows") js.return(true)
		}
	}
	var writeDefaultIntersectionMessage = (lValue, rValue) =>
		`Invalid intersection of default values ${printable(lValue)} & ${printable(rValue)}`

	// ../schema/out/structure/optional.js
	var implementation11 = implementNode({
		kind: "optional",
		hasAssociatedError: false,
		intersectionIsOpen: true,
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema2, ctx) => ctx.$.parseSchema(schema2)
			},
			default: {
				preserveUndefined: true
			}
		},
		normalize: schema2 => schema2,
		reduce: (inner, $) => {
			if ($.resolvedConfig.exactOptionalPropertyTypes === false) {
				if (!inner.value.allows(void 0)) {
					return $.node(
						"optional",
						{ ...inner, value: inner.value.or(intrinsic.undefined) },
						{ prereduced: true }
					)
				}
			}
		},
		defaults: {
			description: node2 => `${node2.compiledKey}?: ${node2.value.description}`
		},
		intersections: {
			optional: intersectProps
		}
	})
	var OptionalNode = class extends BaseProp {
		constructor(...args2) {
			super(...args2)
			if ("default" in this.inner)
				assertDefaultValueAssignability(
					this.value,
					this.inner.default,
					this.key
				)
		}
		get outProp() {
			if (!this.hasDefault()) return this
			const { default: defaultValue, ...requiredInner } = this.inner
			return this.cacheGetter(
				"outProp",
				this.$.node("required", requiredInner, { prereduced: true })
			)
		}
		expression =
			this.hasDefault() ?
				`${this.compiledKey}: ${this.value.expression} = ${printable(this.inner.default)}`
			:	`${this.compiledKey}?: ${this.value.expression}`
		defaultValueMorph = getDefaultableMorph(this)
		defaultValueMorphRef =
			this.defaultValueMorph && registeredReference(this.defaultValueMorph)
	}
	var Optional = {
		implementation: implementation11,
		Node: OptionalNode
	}
	var defaultableMorphCache = {}
	var getDefaultableMorph = node2 => {
		if (!node2.hasDefault()) return
		const cacheKey = `{${node2.compiledKey}: ${node2.value.id} = ${defaultValueSerializer(node2.default)}}`
		return (defaultableMorphCache[cacheKey] ??= computeDefaultValueMorph(
			node2.key,
			node2.value,
			node2.default
		))
	}
	var computeDefaultValueMorph = (key, value2, defaultInput) => {
		if (typeof defaultInput === "function") {
			return value2.includesTransform ?
					(data, ctx) => {
						traverseKey(
							key,
							() => value2((data[key] = defaultInput()), ctx),
							ctx
						)
						return data
					}
				:	data => {
						data[key] = defaultInput()
						return data
					}
		}
		const precomputedMorphedDefault =
			value2.includesTransform ? value2.assert(defaultInput) : defaultInput
		return hasDomain(precomputedMorphedDefault, "object") ?
				// the type signature only allows this if the value was morphed
				(data, ctx) => {
					traverseKey(key, () => value2((data[key] = defaultInput), ctx), ctx)
					return data
				}
			:	data => {
					data[key] = precomputedMorphedDefault
					return data
				}
	}
	var assertDefaultValueAssignability = (node2, value2, key) => {
		const wrapped = isThunk(value2)
		if (hasDomain(value2, "object") && !wrapped)
			throwParseError(writeNonPrimitiveNonFunctionDefaultValueMessage(key))
		const out = node2.in(wrapped ? value2() : value2)
		if (out instanceof ArkErrors) {
			if (key === null) {
				throwParseError(`Default ${out.summary}`)
			}
			const atPath = out.transform(e =>
				e.transform(input => ({ ...input, prefixPath: [key] }))
			)
			throwParseError(`Default for ${atPath.summary}`)
		}
		return value2
	}
	var writeNonPrimitiveNonFunctionDefaultValueMessage = key => {
		const keyDescription =
			key === null ? ""
			: typeof key === "number" ? `for value at [${key}] `
			: `for ${compileSerializedValue(key)} `
		return `Non-primitive default ${keyDescription}must be specified as a function like () => ({my: 'object'})`
	}

	// ../schema/out/roots/root.js
	var BaseRoot = class extends BaseNode {
		constructor(attachments, $) {
			super(attachments, $)
			Object.defineProperty(this, arkKind, { value: "root", enumerable: false })
		}
		get internal() {
			return this
		}
		get "~standard"() {
			return {
				vendor: "arktype",
				version: 1,
				validate: input => {
					const out = this(input)
					if (out instanceof ArkErrors) return out
					return { value: out }
				}
			}
		}
		as() {
			return this
		}
		brand(name) {
			if (name === "") return throwParseError(emptyBrandNameMessage)
			return this
		}
		readonly() {
			return this
		}
		branches = this.hasKind("union") ? this.inner.branches : [this]
		distribute(mapBranch, reduceMapped) {
			const mappedBranches = this.branches.map(mapBranch)
			return reduceMapped?.(mappedBranches) ?? mappedBranches
		}
		get shortDescription() {
			return this.meta.description ?? this.defaultShortDescription
		}
		toJsonSchema() {
			const schema2 = this.innerToJsonSchema()
			return Object.assign(schema2, this.metaJson)
		}
		intersect(r) {
			const rNode = this.$.parseDefinition(r)
			const result = this.rawIntersect(rNode)
			if (result instanceof Disjoint) return result
			return this.$.finalize(result)
		}
		rawIntersect(r) {
			return intersectNodesRoot(this, r, this.$)
		}
		toNeverIfDisjoint() {
			return this
		}
		and(r) {
			const result = this.intersect(r)
			return result instanceof Disjoint ? result.throw() : result
		}
		rawAnd(r) {
			const result = this.rawIntersect(r)
			return result instanceof Disjoint ? result.throw() : result
		}
		or(r) {
			const rNode = this.$.parseDefinition(r)
			return this.$.finalize(this.rawOr(rNode))
		}
		rawOr(r) {
			const branches = [...this.branches, ...r.branches]
			return this.$.node("union", branches)
		}
		map(flatMapEntry) {
			return this.$.schema(this.applyStructuralOperation("map", [flatMapEntry]))
		}
		pick(...keys) {
			return this.$.schema(this.applyStructuralOperation("pick", keys))
		}
		omit(...keys) {
			return this.$.schema(this.applyStructuralOperation("omit", keys))
		}
		required() {
			return this.$.schema(this.applyStructuralOperation("required", []))
		}
		partial() {
			return this.$.schema(this.applyStructuralOperation("partial", []))
		}
		_keyof
		keyof() {
			if (this._keyof) return this._keyof
			const result = this.applyStructuralOperation("keyof", []).reduce(
				(result2, branch) => result2.intersect(branch).toNeverIfDisjoint(),
				$ark.intrinsic.unknown.internal
			)
			if (result.branches.length === 0) {
				throwParseError(
					writeUnsatisfiableExpressionError(`keyof ${this.expression}`)
				)
			}
			return (this._keyof = this.$.finalize(result))
		}
		get props() {
			if (this.branches.length !== 1)
				return throwParseError(writeLiteralUnionEntriesMessage(this.expression))
			return [...this.applyStructuralOperation("props", [])[0]]
		}
		merge(r) {
			const rNode = this.$.parseDefinition(r)
			return this.$.schema(
				rNode.distribute(branch =>
					this.applyStructuralOperation("merge", [
						structureOf(branch) ??
							throwParseError(
								writeNonStructuralOperandMessage("merge", branch.expression)
							)
					])
				)
			)
		}
		applyStructuralOperation(operation, args2) {
			return this.distribute(branch => {
				if (branch.equals($ark.intrinsic.object) && operation !== "merge")
					return branch
				const structure = structureOf(branch)
				if (!structure) {
					throwParseError(
						writeNonStructuralOperandMessage(operation, branch.expression)
					)
				}
				if (operation === "keyof") return structure.keyof()
				if (operation === "get") return structure.get(...args2)
				if (operation === "props") return structure.props
				const structuralMethodName =
					operation === "required" ? "require"
					: operation === "partial" ? "optionalize"
					: operation
				return this.$.node("intersection", {
					...branch.inner,
					structure: structure[structuralMethodName](...args2)
				})
			})
		}
		get(...path) {
			if (path[0] === void 0) return this
			return this.$.schema(this.applyStructuralOperation("get", path))
		}
		extract(r) {
			const rNode = this.$.parseDefinition(r)
			return this.$.schema(
				this.branches.filter(branch => branch.extends(rNode))
			)
		}
		exclude(r) {
			const rNode = this.$.parseDefinition(r)
			return this.$.schema(
				this.branches.filter(branch => !branch.extends(rNode))
			)
		}
		array() {
			return this.$.schema(
				this.isUnknown() ?
					{ proto: Array }
				:	{
						proto: Array,
						sequence: this
					},
				{ prereduced: true }
			)
		}
		overlaps(r) {
			const intersection = this.intersect(r)
			return !(intersection instanceof Disjoint)
		}
		extends(r) {
			const intersection = this.intersect(r)
			return !(intersection instanceof Disjoint) && this.equals(intersection)
		}
		ifExtends(r) {
			return this.extends(r) ? this : void 0
		}
		subsumes(r) {
			const rNode = this.$.parseDefinition(r)
			return rNode.extends(this)
		}
		configure(meta, selector = "shallow") {
			return this.configureReferences(meta, selector)
		}
		describe(description, selector = "shallow") {
			return this.configure({ description }, selector)
		}
		// these should ideally be implemented in arktype since they use its syntax
		// https://github.com/arktypeio/arktype/issues/1223
		optional() {
			return [this, "?"]
		}
		// these should ideally be implemented in arktype since they use its syntax
		// https://github.com/arktypeio/arktype/issues/1223
		default(thunkableValue) {
			assertDefaultValueAssignability(this, thunkableValue, null)
			return [this, "=", thunkableValue]
		}
		from(input) {
			return this.assert(input)
		}
		_pipe(...morphs) {
			const result = morphs.reduce((acc, morph) => acc.rawPipeOnce(morph), this)
			return this.$.finalize(result)
		}
		tryPipe(...morphs) {
			const result = morphs.reduce(
				(acc, morph) =>
					acc.rawPipeOnce(
						hasArkKind(morph, "root") ? morph : (
							(In, ctx) => {
								try {
									return morph(In, ctx)
								} catch (e) {
									return ctx.error({
										code: "predicate",
										predicate: morph,
										actual: `aborted due to error:
    ${e}
`
									})
								}
							}
						)
					),
				this
			)
			return this.$.finalize(result)
		}
		pipe = Object.assign(this._pipe.bind(this), {
			try: this.tryPipe.bind(this)
		})
		to(def) {
			return this.$.finalize(this.toNode(this.$.parseDefinition(def)))
		}
		toNode(root) {
			const result = pipeNodesRoot(this, root, this.$)
			if (result instanceof Disjoint) return result.throw()
			return result
		}
		rawPipeOnce(morph) {
			if (hasArkKind(morph, "root")) return this.toNode(morph)
			return this.distribute(
				branch =>
					branch.hasKind("morph") ?
						this.$.node("morph", {
							in: branch.inner.in,
							morphs: [...branch.morphs, morph]
						})
					:	this.$.node("morph", {
							in: branch,
							morphs: [morph]
						}),
				this.$.parseSchema
			)
		}
		narrow(predicate) {
			return this.constrainOut("predicate", predicate)
		}
		constrain(kind, schema2) {
			return this._constrain("root", kind, schema2)
		}
		constrainIn(kind, schema2) {
			return this._constrain("in", kind, schema2)
		}
		constrainOut(kind, schema2) {
			return this._constrain("out", kind, schema2)
		}
		_constrain(io, kind, schema2) {
			const constraint = this.$.node(kind, schema2)
			if (constraint.isRoot()) {
				return constraint.isUnknown() ? this : (
						throwInternalError(`Unexpected constraint node ${constraint}`)
					)
			}
			const operand = io === "root" ? this : this[io]
			if (
				operand.hasKind("morph") ||
				(constraint.impliedBasis && !operand.extends(constraint.impliedBasis))
			) {
				return throwInvalidOperandError(kind, constraint.impliedBasis, this)
			}
			const partialIntersection = this.$.node("intersection", {
				// important this is constraint.kind instead of kind in case
				// the node was reduced during parsing
				[constraint.kind]: constraint
			})
			const result =
				io === "out" ?
					pipeNodesRoot(this, partialIntersection, this.$)
				:	intersectNodesRoot(this, partialIntersection, this.$)
			if (result instanceof Disjoint) result.throw()
			return this.$.finalize(result)
		}
		onUndeclaredKey(cfg) {
			const rule = typeof cfg === "string" ? cfg : cfg.rule
			const deep = typeof cfg === "string" ? false : cfg.deep
			return this.$.finalize(
				this.transform(
					(kind, inner) =>
						kind === "structure" ?
							rule === "ignore" ?
								omit(inner, { undeclared: 1 })
							:	{ ...inner, undeclared: rule }
						:	inner,
					deep ? void 0 : (
						{ shouldTransform: node2 => !includes(structuralKinds, node2.kind) }
					)
				)
			)
		}
		hasEqualMorphs(r) {
			if (!this.includesTransform && !r.includesTransform) return true
			if (!arrayEquals(this.shallowMorphs, r.shallowMorphs)) return false
			if (
				!arrayEquals(this.flatMorphs, r.flatMorphs, {
					isEqual: (l, r2) =>
						l.propString === r2.propString &&
						(l.node.hasKind("morph") && r2.node.hasKind("morph") ?
							l.node.hasEqualMorphs(r2.node)
						: (
							l.node.hasKind("intersection") && r2.node.hasKind("intersection")
						) ?
							l.node.structure?.structuralMorphRef ===
							r2.node.structure?.structuralMorphRef
						:	false)
				})
			)
				return false
			return true
		}
		onDeepUndeclaredKey(behavior) {
			return this.onUndeclaredKey({ rule: behavior, deep: true })
		}
		filter(predicate) {
			return this.constrainIn("predicate", predicate)
		}
		divisibleBy(schema2) {
			return this.constrain("divisor", schema2)
		}
		matching(schema2) {
			return this.constrain("pattern", schema2)
		}
		atLeast(schema2) {
			return this.constrain("min", schema2)
		}
		atMost(schema2) {
			return this.constrain("max", schema2)
		}
		moreThan(schema2) {
			return this.constrain("min", exclusivizeRangeSchema(schema2))
		}
		lessThan(schema2) {
			return this.constrain("max", exclusivizeRangeSchema(schema2))
		}
		atLeastLength(schema2) {
			return this.constrain("minLength", schema2)
		}
		atMostLength(schema2) {
			return this.constrain("maxLength", schema2)
		}
		moreThanLength(schema2) {
			return this.constrain("minLength", exclusivizeRangeSchema(schema2))
		}
		lessThanLength(schema2) {
			return this.constrain("maxLength", exclusivizeRangeSchema(schema2))
		}
		exactlyLength(schema2) {
			return this.constrain("exactLength", schema2)
		}
		atOrAfter(schema2) {
			return this.constrain("after", schema2)
		}
		atOrBefore(schema2) {
			return this.constrain("before", schema2)
		}
		laterThan(schema2) {
			return this.constrain("after", exclusivizeRangeSchema(schema2))
		}
		earlierThan(schema2) {
			return this.constrain("before", exclusivizeRangeSchema(schema2))
		}
	}
	var emptyBrandNameMessage = `Expected a non-empty brand name after #`
	var exclusivizeRangeSchema = schema2 =>
		typeof schema2 === "object" && !(schema2 instanceof Date) ?
			{ ...schema2, exclusive: true }
		:	{
				rule: schema2,
				exclusive: true
			}
	var typeOrTermExtends = (t, base) =>
		hasArkKind(base, "root") ?
			hasArkKind(t, "root") ? t.extends(base)
			:	base.allows(t)
		: hasArkKind(t, "root") ? t.hasUnit(base)
		: base === t
	var structureOf = branch => {
		if (branch.hasKind("morph")) return null
		if (branch.hasKind("intersection")) {
			return (
				branch.inner.structure ??
				(branch.basis?.domain === "object" ?
					branch.$.bindReference($ark.intrinsic.emptyStructure)
				:	null)
			)
		}
		if (branch.isBasis() && branch.domain === "object")
			return branch.$.bindReference($ark.intrinsic.emptyStructure)
		return null
	}
	var writeLiteralUnionEntriesMessage =
		expression => `Props cannot be extracted from a union. Use .distribute to extract props from each branch instead. Received:
${expression}`
	var writeNonStructuralOperandMessage = (operation, operand) =>
		`${operation} operand must be an object (was ${operand})`

	// ../schema/out/roots/utils.js
	var defineRightwardIntersections = (kind, implementation23) =>
		flatMorph(schemaKindsRightOf(kind), (i, kind2) => [kind2, implementation23])

	// ../schema/out/roots/alias.js
	var normalizeAliasSchema = schema2 =>
		typeof schema2 === "string" ? { reference: schema2 } : schema2
	var neverIfDisjoint = result =>
		result instanceof Disjoint ? $ark.intrinsic.never.internal : result
	var implementation12 = implementNode({
		kind: "alias",
		hasAssociatedError: false,
		collapsibleKey: "reference",
		keys: {
			reference: {
				serialize: s => (s.startsWith("$") ? s : `$ark.${s}`)
			},
			resolve: {}
		},
		normalize: normalizeAliasSchema,
		defaults: {
			description: node2 => node2.reference
		},
		intersections: {
			alias: (l, r, ctx) =>
				ctx.$.lazilyResolve(
					() =>
						neverIfDisjoint(
							intersectOrPipeNodes(l.resolution, r.resolution, ctx)
						),
					`${l.reference}${ctx.pipe ? "=>" : "&"}${r.reference}`
				),
			...defineRightwardIntersections("alias", (l, r, ctx) => {
				if (r.isUnknown()) return l
				if (r.isNever()) return r
				if (r.isBasis() && !r.overlaps($ark.intrinsic.object)) {
					return Disjoint.init("assignability", $ark.intrinsic.object, r)
				}
				return ctx.$.lazilyResolve(
					() => neverIfDisjoint(intersectOrPipeNodes(l.resolution, r, ctx)),
					`${l.reference}${ctx.pipe ? "=>" : "&"}${r.id}`
				)
			})
		}
	})
	var AliasNode = class extends BaseRoot {
		expression = this.reference
		structure = void 0
		get resolution() {
			const result = this._resolve()
			return (nodesByRegisteredId[this.id] = result)
		}
		_resolve() {
			if (this.resolve) return this.resolve()
			if (this.reference[0] === "$")
				return this.$.resolveRoot(this.reference.slice(1))
			const id = this.reference
			let resolution = nodesByRegisteredId[id]
			const seen = []
			while (hasArkKind(resolution, "context")) {
				if (seen.includes(resolution.id)) {
					return throwParseError(
						writeShallowCycleErrorMessage(resolution.id, seen)
					)
				}
				seen.push(resolution.id)
				resolution = nodesByRegisteredId[resolution.id]
			}
			if (!hasArkKind(resolution, "root")) {
				return throwInternalError(`Unexpected resolution for reference ${this.reference}
Seen: [${seen.join("->")}] 
Resolution: ${printable(resolution)}`)
			}
			return resolution
		}
		get resolutionId() {
			if (this.reference.includes("&") || this.reference.includes("=>"))
				return this.resolution.id
			if (this.reference[0] !== "$") return this.reference
			const alias = this.reference.slice(1)
			const resolution = this.$.resolutions[alias]
			if (typeof resolution === "string") return resolution
			if (hasArkKind(resolution, "root")) return resolution.id
			return throwInternalError(
				`Unexpected resolution for reference ${this.reference}: ${printable(resolution)}`
			)
		}
		get defaultShortDescription() {
			return domainDescriptions.object
		}
		innerToJsonSchema() {
			return JsonSchema.throwUnjsonifiableError(this.expression, "cyclic")
		}
		traverseAllows = (data, ctx) => {
			const seen = ctx.seen[this.reference]
			if (seen?.includes(data)) return true
			ctx.seen[this.reference] = append(seen, data)
			return this.resolution.traverseAllows(data, ctx)
		}
		traverseApply = (data, ctx) => {
			const seen = ctx.seen[this.reference]
			if (seen?.includes(data)) return
			ctx.seen[this.reference] = append(seen, data)
			this.resolution.traverseApply(data, ctx)
		}
		compile(js) {
			const id = this.resolutionId
			js.if(`ctx.seen.${id} && ctx.seen.${id}.includes(data)`, () =>
				js.return(true)
			)
			js.if(`!ctx.seen.${id}`, () => js.line(`ctx.seen.${id} = []`))
			js.line(`ctx.seen.${id}.push(data)`)
			js.return(js.invoke(id))
		}
	}
	var writeShallowCycleErrorMessage = (name, seen) =>
		`Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join("->")}`
	var Alias = {
		implementation: implementation12,
		Node: AliasNode
	}

	// ../schema/out/roots/basis.js
	var InternalBasis = class extends BaseRoot {
		traverseApply = (data, ctx) => {
			if (!this.traverseAllows(data, ctx))
				ctx.errorFromNodeContext(this.errorContext)
		}
		get errorContext() {
			return {
				code: this.kind,
				description: this.description,
				meta: this.meta,
				...this.inner
			}
		}
		get compiledErrorContext() {
			return compileObjectLiteral(this.errorContext)
		}
		compile(js) {
			if (js.traversalKind === "Allows") js.return(this.compiledCondition)
			else {
				js.if(this.compiledNegation, () =>
					js.line(
						`${js.ctx}.errorFromNodeContext(${this.compiledErrorContext})`
					)
				)
			}
		}
	}

	// ../schema/out/roots/domain.js
	var implementation13 = implementNode({
		kind: "domain",
		hasAssociatedError: true,
		collapsibleKey: "domain",
		keys: {
			domain: {},
			numberAllowsNaN: {}
		},
		normalize: schema2 =>
			typeof schema2 === "string" ? { domain: schema2 }
			: hasKey(schema2, "numberAllowsNaN") && schema2.domain !== "number" ?
				throwParseError(Domain.writeBadAllowNanMessage(schema2.domain))
			:	schema2,
		applyConfig: (schema2, config) =>
			(
				schema2.numberAllowsNaN === void 0 &&
				schema2.domain === "number" &&
				config.numberAllowsNaN
			) ?
				{ ...schema2, numberAllowsNaN: true }
			:	schema2,
		defaults: {
			description: node2 => domainDescriptions[node2.domain],
			actual: data =>
				Number.isNaN(data) ? "NaN" : domainDescriptions[domainOf(data)]
		},
		intersections: {
			domain: (l, r) =>
				// since l === r is handled by default, remaining cases are disjoint
				// outside those including options like numberAllowsNaN
				l.domain === "number" && r.domain === "number" ?
					l.numberAllowsNaN ?
						r
					:	l
				:	Disjoint.init("domain", l, r)
		}
	})
	var DomainNode = class extends InternalBasis {
		requiresNaNCheck = this.domain === "number" && !this.numberAllowsNaN
		traverseAllows =
			this.requiresNaNCheck ?
				data => typeof data === "number" && !Number.isNaN(data)
			:	data => domainOf(data) === this.domain
		compiledCondition =
			this.domain === "object" ?
				`((typeof data === "object" && data !== null) || typeof data === "function")`
			:	`typeof data === "${this.domain}"${this.requiresNaNCheck ? " && !Number.isNaN(data)" : ""}`
		compiledNegation =
			this.domain === "object" ?
				`((typeof data !== "object" || data === null) && typeof data !== "function")`
			:	`typeof data !== "${this.domain}"${this.requiresNaNCheck ? " || Number.isNaN(data)" : ""}`
		expression = this.numberAllowsNaN ? "number | NaN" : this.domain
		get nestableExpression() {
			return this.numberAllowsNaN ? `(${this.expression})` : this.expression
		}
		get defaultShortDescription() {
			return domainDescriptions[this.domain]
		}
		innerToJsonSchema() {
			if (this.domain === "bigint" || this.domain === "symbol")
				return JsonSchema.throwUnjsonifiableError(this.domain)
			return {
				type: this.domain
			}
		}
	}
	var Domain = {
		implementation: implementation13,
		Node: DomainNode,
		writeBadAllowNanMessage: actual =>
			`numberAllowsNaN may only be specified with domain "number" (was ${actual})`
	}

	// ../schema/out/roots/intersection.js
	var implementation14 = implementNode({
		kind: "intersection",
		hasAssociatedError: true,
		normalize: rawSchema => {
			if (isNode(rawSchema)) return rawSchema
			const { structure, ...schema2 } = rawSchema
			const hasRootStructureKey = !!structure
			const normalizedStructure = structure ?? {}
			const normalized = flatMorph(schema2, (k, v) => {
				if (isKeyOf(k, structureKeys)) {
					if (hasRootStructureKey) {
						throwParseError(
							`Flattened structure key ${k} cannot be specified alongside a root 'structure' key.`
						)
					}
					normalizedStructure[k] = v
					return []
				}
				return [k, v]
			})
			if (
				hasArkKind(normalizedStructure, "constraint") ||
				!isEmptyObject(normalizedStructure)
			)
				normalized.structure = normalizedStructure
			return normalized
		},
		finalizeInnerJson: ({ structure, ...rest }) =>
			hasDomain(structure, "object") ? { ...structure, ...rest } : rest,
		keys: {
			domain: {
				child: true,
				parse: (schema2, ctx) => ctx.$.node("domain", schema2)
			},
			proto: {
				child: true,
				parse: (schema2, ctx) => ctx.$.node("proto", schema2)
			},
			structure: {
				child: true,
				parse: (schema2, ctx) => ctx.$.node("structure", schema2),
				serialize: node2 => {
					if (!node2.sequence?.minLength) return node2.collapsibleJson
					const { sequence, ...structureJson } = node2.collapsibleJson
					const { minVariadicLength, ...sequenceJson } = sequence
					const collapsibleSequenceJson =
						sequenceJson.variadic && Object.keys(sequenceJson).length === 1 ?
							sequenceJson.variadic
						:	sequenceJson
					return { ...structureJson, sequence: collapsibleSequenceJson }
				}
			},
			divisor: {
				child: true,
				parse: constraintKeyParser("divisor")
			},
			max: {
				child: true,
				parse: constraintKeyParser("max")
			},
			min: {
				child: true,
				parse: constraintKeyParser("min")
			},
			maxLength: {
				child: true,
				parse: constraintKeyParser("maxLength")
			},
			minLength: {
				child: true,
				parse: constraintKeyParser("minLength")
			},
			exactLength: {
				child: true,
				parse: constraintKeyParser("exactLength")
			},
			before: {
				child: true,
				parse: constraintKeyParser("before")
			},
			after: {
				child: true,
				parse: constraintKeyParser("after")
			},
			pattern: {
				child: true,
				parse: constraintKeyParser("pattern")
			},
			predicate: {
				child: true,
				parse: constraintKeyParser("predicate")
			}
		},
		// leverage reduction logic from intersection and identity to ensure initial
		// parse result is reduced
		reduce: (inner, $) =>
			// we cast union out of the result here since that only occurs when intersecting two sequences
			// that cannot occur when reducing a single intersection schema using unknown
			intersectIntersections({}, inner, {
				$,
				invert: false,
				pipe: false
			}),
		defaults: {
			description: node2 => {
				if (node2.children.length === 0) return "unknown"
				if (node2.structure) return node2.structure.description
				const childDescriptions = []
				if (
					node2.basis &&
					!node2.refinements.some(r => r.impl.obviatesBasisDescription)
				)
					childDescriptions.push(node2.basis.description)
				if (node2.refinements.length) {
					const sortedRefinementDescriptions = node2.refinements
						.toSorted((l, r) => (l.kind === "min" && r.kind === "max" ? -1 : 0))
						.map(r => r.description)
					childDescriptions.push(...sortedRefinementDescriptions)
				}
				if (node2.inner.predicate) {
					childDescriptions.push(
						...node2.inner.predicate.map(p => p.description)
					)
				}
				return childDescriptions.join(" and ")
			},
			expected: source =>
				`  \u25E6 ${source.errors.map(e => e.expected).join("\n  \u25E6 ")}`,
			problem: ctx => `(${ctx.actual}) must be...
${ctx.expected}`
		},
		intersections: {
			intersection: (l, r, ctx) =>
				intersectIntersections(l.inner, r.inner, ctx),
			...defineRightwardIntersections("intersection", (l, r, ctx) => {
				if (l.children.length === 0) return r
				const { domain, proto, ...lInnerConstraints } = l.inner
				const lBasis = proto ?? domain
				const basis = lBasis ? intersectOrPipeNodes(lBasis, r, ctx) : r
				return (
					basis instanceof Disjoint ? basis
					: l?.basis?.equals(basis) ?
						// if the basis doesn't change, return the original intesection
						l
					:	l.$.node(
							"intersection",
							{ ...lInnerConstraints, [basis.kind]: basis },
							{ prereduced: true }
						)
				)
			})
		}
	})
	var IntersectionNode = class extends BaseRoot {
		basis = this.inner.domain ?? this.inner.proto ?? null
		refinements = this.children.filter(node2 => node2.isRefinement())
		structure = this.inner.structure
		expression = writeIntersectionExpression(this)
		get shallowMorphs() {
			return this.inner.structure?.structuralMorph ?
					[this.inner.structure.structuralMorph]
				:	[]
		}
		get defaultShortDescription() {
			return this.basis?.defaultShortDescription ?? "present"
		}
		innerToJsonSchema() {
			return this.children.reduce(
				// cast is required since TS doesn't know children have compatible schema prerequisites
				(schema2, child) =>
					child.isBasis() ?
						child.toJsonSchema()
					:	child.reduceJsonSchema(schema2),
				{}
			)
		}
		traverseAllows = (data, ctx) =>
			this.children.every(child => child.traverseAllows(data, ctx))
		traverseApply = (data, ctx) => {
			const errorCount = ctx.currentErrorCount
			if (this.basis) {
				this.basis.traverseApply(data, ctx)
				if (ctx.currentErrorCount > errorCount) return
			}
			if (this.refinements.length) {
				for (let i = 0; i < this.refinements.length - 1; i++) {
					this.refinements[i].traverseApply(data, ctx)
					if (ctx.failFast && ctx.currentErrorCount > errorCount) return
				}
				this.refinements.at(-1).traverseApply(data, ctx)
				if (ctx.currentErrorCount > errorCount) return
			}
			if (this.structure) {
				this.structure.traverseApply(data, ctx)
				if (ctx.currentErrorCount > errorCount) return
			}
			if (this.inner.predicate) {
				for (let i = 0; i < this.inner.predicate.length - 1; i++) {
					this.inner.predicate[i].traverseApply(data, ctx)
					if (ctx.failFast && ctx.currentErrorCount > errorCount) return
				}
				this.inner.predicate.at(-1).traverseApply(data, ctx)
			}
		}
		compile(js) {
			if (js.traversalKind === "Allows") {
				this.children.forEach(child => js.check(child))
				js.return(true)
				return
			}
			js.initializeErrorCount()
			if (this.basis) {
				js.check(this.basis)
				if (this.children.length > 1) js.returnIfFail()
			}
			if (this.refinements.length) {
				for (let i = 0; i < this.refinements.length - 1; i++) {
					js.check(this.refinements[i])
					js.returnIfFailFast()
				}
				js.check(this.refinements.at(-1))
				if (this.structure || this.inner.predicate) js.returnIfFail()
			}
			if (this.structure) {
				js.check(this.structure)
				if (this.inner.predicate) js.returnIfFail()
			}
			if (this.inner.predicate) {
				for (let i = 0; i < this.inner.predicate.length - 1; i++) {
					js.check(this.inner.predicate[i])
					js.returnIfFail()
				}
				js.check(this.inner.predicate.at(-1))
			}
		}
	}
	var Intersection = {
		implementation: implementation14,
		Node: IntersectionNode
	}
	var writeIntersectionExpression = node2 => {
		let expression =
			node2.structure?.expression ||
			`${node2.basis && !node2.refinements.some(n => n.impl.obviatesBasisExpression) ? node2.basis.nestableExpression + " " : ""}${node2.refinements.map(n => n.expression).join(" & ")}` ||
			"unknown"
		if (expression === "Array == 0") expression = "[]"
		return expression
	}
	var intersectIntersections = (l, r, ctx) => {
		const baseInner = {}
		const lBasis = l.proto ?? l.domain
		const rBasis = r.proto ?? r.domain
		const basisResult =
			lBasis ?
				rBasis ? intersectOrPipeNodes(lBasis, rBasis, ctx)
				:	lBasis
			:	rBasis
		if (basisResult instanceof Disjoint) return basisResult
		if (basisResult) baseInner[basisResult.kind] = basisResult
		return intersectConstraints({
			kind: "intersection",
			baseInner,
			l: flattenConstraints(l),
			r: flattenConstraints(r),
			roots: [],
			ctx
		})
	}

	// ../schema/out/roots/morph.js
	var implementation15 = implementNode({
		kind: "morph",
		hasAssociatedError: false,
		keys: {
			in: {
				child: true,
				parse: (schema2, ctx) => ctx.$.parseSchema(schema2)
			},
			morphs: {
				parse: liftArray,
				serialize: morphs =>
					morphs.map(m =>
						hasArkKind(m, "root") ? m.json : registeredReference(m)
					)
			},
			declaredIn: {
				child: false,
				serialize: node2 => node2.json
			},
			declaredOut: {
				child: false,
				serialize: node2 => node2.json
			}
		},
		normalize: schema2 => schema2,
		defaults: {
			description: node2 =>
				`a morph from ${node2.in.description} to ${node2.out?.description ?? "unknown"}`
		},
		intersections: {
			morph: (l, r, ctx) => {
				if (!l.hasEqualMorphs(r)) {
					return throwParseError(
						writeMorphIntersectionMessage(l.expression, r.expression)
					)
				}
				const inTersection = intersectOrPipeNodes(l.in, r.in, ctx)
				if (inTersection instanceof Disjoint) return inTersection
				const baseInner = {
					morphs: l.morphs
				}
				if (l.declaredIn || r.declaredIn) {
					const declaredIn = intersectOrPipeNodes(l.in, r.in, ctx)
					if (declaredIn instanceof Disjoint) return declaredIn.throw()
					else baseInner.declaredIn = declaredIn
				}
				if (l.declaredOut || r.declaredOut) {
					const declaredOut = intersectOrPipeNodes(l.out, r.out, ctx)
					if (declaredOut instanceof Disjoint) return declaredOut.throw()
					else baseInner.declaredOut = declaredOut
				}
				return inTersection.distribute(
					inBranch =>
						ctx.$.node("morph", {
							...baseInner,
							in: inBranch
						}),
					ctx.$.parseSchema
				)
			},
			...defineRightwardIntersections("morph", (l, r, ctx) => {
				const inTersection =
					l.inner.in ? intersectOrPipeNodes(l.inner.in, r, ctx) : r
				return (
					inTersection instanceof Disjoint ? inTersection
					: inTersection.equals(l.inner.in) ? l
					: ctx.$.node("morph", {
							...l.inner,
							in: inTersection
						})
				)
			})
		}
	})
	var MorphNode = class extends BaseRoot {
		serializedMorphs = this.morphs.map(registeredReference)
		compiledMorphs = `[${this.serializedMorphs}]`
		lastMorph = this.inner.morphs.at(-1)
		lastMorphIfNode =
			hasArkKind(this.lastMorph, "root") ? this.lastMorph : void 0
		introspectableIn = this.inner.in
		introspectableOut =
			this.lastMorphIfNode ?
				Object.assign(
					this.referencesById,
					this.lastMorphIfNode.referencesById
				) && this.lastMorphIfNode.out
			:	void 0
		get shallowMorphs() {
			return Array.isArray(this.inner.in?.shallowMorphs) ?
					[...this.inner.in.shallowMorphs, ...this.morphs]
				:	this.morphs
		}
		get in() {
			return (
				this.declaredIn ?? this.inner.in?.in ?? $ark.intrinsic.unknown.internal
			)
		}
		get out() {
			return (
				this.declaredOut ??
				this.introspectableOut ??
				$ark.intrinsic.unknown.internal
			)
		}
		declareIn(declaredIn) {
			return this.$.node("morph", {
				...this.inner,
				declaredIn
			})
		}
		declareOut(declaredOut) {
			return this.$.node("morph", {
				...this.inner,
				declaredOut
			})
		}
		expression = `(In: ${this.in.expression}) => ${this.lastMorphIfNode ? "To" : "Out"}<${this.out.expression}>`
		get defaultShortDescription() {
			return this.in.meta.description ?? this.in.defaultShortDescription
		}
		innerToJsonSchema() {
			return JsonSchema.throwUnjsonifiableError(this.expression, "morph")
		}
		compile(js) {
			if (js.traversalKind === "Allows") {
				if (!this.introspectableIn) return
				js.return(js.invoke(this.introspectableIn))
				return
			}
			if (this.introspectableIn) js.line(js.invoke(this.introspectableIn))
			js.line(`ctx.queueMorphs(${this.compiledMorphs})`)
		}
		traverseAllows = (data, ctx) =>
			!this.introspectableIn || this.introspectableIn.traverseAllows(data, ctx)
		traverseApply = (data, ctx) => {
			if (this.introspectableIn) this.introspectableIn.traverseApply(data, ctx)
			ctx.queueMorphs(this.morphs)
		}
		/** Check if the morphs of r are equal to those of this node */
		hasEqualMorphs(r) {
			return arrayEquals(this.morphs, r.morphs, {
				isEqual: (lMorph, rMorph) =>
					lMorph === rMorph ||
					(hasArkKind(lMorph, "root") &&
						hasArkKind(rMorph, "root") &&
						lMorph.equals(rMorph))
			})
		}
	}
	var Morph = {
		implementation: implementation15,
		Node: MorphNode
	}
	var writeMorphIntersectionMessage = (
		lDescription,
		rDescription
	) => `The intersection of distinct morphs at a single path is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`

	// ../schema/out/roots/proto.js
	var implementation16 = implementNode({
		kind: "proto",
		hasAssociatedError: true,
		collapsibleKey: "proto",
		keys: {
			proto: {
				serialize: ctor =>
					getBuiltinNameOfConstructor(ctor) ?? defaultValueSerializer(ctor)
			},
			dateAllowsInvalid: {}
		},
		normalize: schema2 => {
			const normalized =
				typeof schema2 === "string" ? { proto: builtinConstructors[schema2] }
				: typeof schema2 === "function" ?
					isNode(schema2) ? schema2
					:	{ proto: schema2 }
				: typeof schema2.proto === "string" ?
					{ ...schema2, proto: builtinConstructors[schema2.proto] }
				:	schema2
			if (typeof normalized.proto !== "function")
				throwParseError(Proto.writeInvalidSchemaMessage(normalized.proto))
			if (hasKey(normalized, "dateAllowsInvalid") && normalized.proto !== Date)
				throwParseError(Proto.writeBadInvalidDateMessage(normalized.proto))
			return normalized
		},
		applyConfig: (schema2, config) => {
			if (
				schema2.dateAllowsInvalid === void 0 &&
				schema2.proto === Date &&
				config.dateAllowsInvalid
			)
				return { ...schema2, dateAllowsInvalid: true }
			return schema2
		},
		defaults: {
			description: node2 =>
				node2.builtinName ?
					objectKindDescriptions[node2.builtinName]
				:	`an instance of ${node2.proto.name}`,
			actual: data =>
				data instanceof Date && data.toString() === "Invalid Date" ?
					"an invalid Date"
				:	objectKindOrDomainOf(data)
		},
		intersections: {
			proto: (l, r) =>
				l.proto === Date && r.proto === Date ?
					// since l === r is handled by default,
					// exactly one of l or r must have allow invalid dates
					l.dateAllowsInvalid ?
						r
					:	l
				: constructorExtends(l.proto, r.proto) ? l
				: constructorExtends(r.proto, l.proto) ? r
				: Disjoint.init("proto", l, r),
			domain: (proto, domain) =>
				domain.domain === "object" ?
					proto
				:	Disjoint.init("domain", $ark.intrinsic.object.internal, domain)
		}
	})
	var ProtoNode = class extends InternalBasis {
		builtinName = getBuiltinNameOfConstructor(this.proto)
		serializedConstructor = this.json.proto
		requiresInvalidDateCheck = this.proto === Date && !this.dateAllowsInvalid
		traverseAllows =
			this.requiresInvalidDateCheck ?
				data => data instanceof Date && data.toString() !== "Invalid Date"
			:	data => data instanceof this.proto
		compiledCondition = `data instanceof ${this.serializedConstructor}${this.requiresInvalidDateCheck ? ` && data.toString() !== "Invalid Date"` : ""}`
		compiledNegation = `!(${this.compiledCondition})`
		innerToJsonSchema() {
			switch (this.builtinName) {
				case "Array":
					return {
						type: "array"
					}
				default:
					return JsonSchema.throwUnjsonifiableError(this.description)
			}
		}
		expression = this.dateAllowsInvalid ? "Date | InvalidDate" : this.proto.name
		get nestableExpression() {
			return this.dateAllowsInvalid ? `(${this.expression})` : this.expression
		}
		domain = "object"
		get defaultShortDescription() {
			return this.description
		}
	}
	var Proto = {
		implementation: implementation16,
		Node: ProtoNode,
		writeBadInvalidDateMessage: actual =>
			`dateAllowsInvalid may only be specified with constructor Date (was ${actual.name})`,
		writeInvalidSchemaMessage: actual =>
			`instanceOf operand must be a function (was ${domainOf(actual)})`
	}

	// ../schema/out/roots/union.js
	var implementation17 = implementNode({
		kind: "union",
		hasAssociatedError: true,
		collapsibleKey: "branches",
		keys: {
			ordered: {},
			branches: {
				child: true,
				parse: (schema2, ctx) => {
					const branches = []
					schema2.forEach(branchSchema => {
						const branchNodes =
							hasArkKind(branchSchema, "root") ?
								branchSchema.branches
							:	ctx.$.parseSchema(branchSchema).branches
						branchNodes.forEach(node2 => {
							if (node2.hasKind("morph")) {
								const matchingMorphIndex = branches.findIndex(
									matching =>
										matching.hasKind("morph") && matching.hasEqualMorphs(node2)
								)
								if (matchingMorphIndex === -1) branches.push(node2)
								else {
									const matchingMorph = branches[matchingMorphIndex]
									branches[matchingMorphIndex] = ctx.$.node("morph", {
										...matchingMorph.inner,
										in: matchingMorph.in.rawOr(node2.in)
									})
								}
							} else branches.push(node2)
						})
					})
					if (!ctx.def.ordered)
						branches.sort((l, r) => (l.hash < r.hash ? -1 : 1))
					return branches
				}
			}
		},
		normalize: schema2 => (isArray(schema2) ? { branches: schema2 } : schema2),
		reduce: (inner, $) => {
			const reducedBranches = reduceBranches(inner)
			if (reducedBranches.length === 1) return reducedBranches[0]
			if (reducedBranches.length === inner.branches.length) return
			return $.node(
				"union",
				{
					...inner,
					branches: reducedBranches
				},
				{ prereduced: true }
			)
		},
		defaults: {
			description: node2 =>
				node2.distribute(branch => branch.description, describeBranches),
			expected: ctx => {
				const byPath = groupBy(ctx.errors, "propString")
				const pathDescriptions = Object.entries(byPath).map(
					([path, errors]) => {
						const branchesAtPath = []
						errors.forEach(errorAtPath =>
							// avoid duplicate messages when multiple branches
							// are invalid due to the same error
							appendUnique(branchesAtPath, errorAtPath.expected)
						)
						const expected = describeBranches(branchesAtPath)
						const actual =
							errors.every(e => e.actual === errors[0].actual) ?
								errors[0].actual
							:	printable(errors[0].data)
						return `${path && `${path} `}must be ${expected}${actual && ` (was ${actual})`}`
					}
				)
				return describeBranches(pathDescriptions)
			},
			problem: ctx => ctx.expected,
			message: ctx => ctx.problem
		},
		intersections: {
			union: (l, r, ctx) => {
				if (l.isNever !== r.isNever) {
					return Disjoint.init("presence", l, r)
				}
				let resultBranches
				if (l.ordered) {
					if (r.ordered) {
						throwParseError(
							writeOrderedIntersectionMessage(l.expression, r.expression)
						)
					}
					resultBranches = intersectBranches(r.branches, l.branches, ctx)
					if (resultBranches instanceof Disjoint) resultBranches.invert()
				} else resultBranches = intersectBranches(l.branches, r.branches, ctx)
				if (resultBranches instanceof Disjoint) return resultBranches
				return ctx.$.parseSchema(
					l.ordered || r.ordered ?
						{
							branches: resultBranches,
							ordered: true
						}
					:	{ branches: resultBranches }
				)
			},
			...defineRightwardIntersections("union", (l, r, ctx) => {
				const branches = intersectBranches(l.branches, [r], ctx)
				if (branches instanceof Disjoint) return branches
				if (branches.length === 1) return branches[0]
				return ctx.$.parseSchema(
					l.ordered ? { branches, ordered: true } : { branches }
				)
			})
		}
	})
	var UnionNode = class extends BaseRoot {
		isBoolean =
			this.branches.length === 2 &&
			this.branches[0].hasUnit(false) &&
			this.branches[1].hasUnit(true)
		get branchGroups() {
			const branchGroups = []
			let firstBooleanIndex = -1
			this.branches.forEach(branch => {
				if (branch.hasKind("unit") && branch.domain === "boolean") {
					if (firstBooleanIndex === -1) {
						firstBooleanIndex = branchGroups.length
						branchGroups.push(branch)
					} else branchGroups[firstBooleanIndex] = $ark.intrinsic.boolean
					return
				}
				branchGroups.push(branch)
			})
			return branchGroups
		}
		unitBranches = this.branches.filter(n => n.in.hasKind("unit"))
		discriminant = this.discriminate()
		discriminantJson =
			this.discriminant ? discriminantToJson(this.discriminant) : null
		expression = this.distribute(n => n.nestableExpression, expressBranches)
		createBranchedOptimisticRootApply() {
			return (data, onFail) => {
				const optimisticResult = this.traverseOptimistic(data)
				if (optimisticResult !== unset) return optimisticResult
				const ctx = new Traversal(data, this.$.resolvedConfig)
				this.traverseApply(data, ctx)
				return ctx.finalize(onFail)
			}
		}
		get shallowMorphs() {
			return this.branches.reduce(
				(morphs, branch) => appendUnique(morphs, branch.shallowMorphs),
				[]
			)
		}
		get defaultShortDescription() {
			return this.distribute(
				branch => branch.defaultShortDescription,
				describeBranches
			)
		}
		innerToJsonSchema() {
			if (
				this.branchGroups.length === 1 &&
				this.branchGroups[0].equals($ark.intrinsic.boolean)
			)
				return { type: "boolean" }
			return {
				anyOf: this.branchGroups.map(group => group.toJsonSchema())
			}
		}
		traverseAllows = (data, ctx) =>
			this.branches.some(b => b.traverseAllows(data, ctx))
		traverseApply = (data, ctx) => {
			const errors = []
			for (let i = 0; i < this.branches.length; i++) {
				ctx.pushBranch()
				this.branches[i].traverseApply(data, ctx)
				if (!ctx.hasError()) {
					if (this.branches[i].includesTransform)
						return ctx.queuedMorphs.push(...ctx.popBranch().queuedMorphs)
					return ctx.popBranch()
				}
				errors.push(ctx.popBranch().error)
			}
			ctx.errorFromNodeContext({ code: "union", errors, meta: this.meta })
		}
		traverseOptimistic = data => {
			for (let i = 0; i < this.branches.length; i++) {
				const branch = this.branches[i]
				if (branch.traverseAllows(data)) {
					if (branch.contextFreeMorph) return branch.contextFreeMorph(data)
					return data
				}
			}
			return unset
		}
		compile(js) {
			if (
				!this.discriminant || // if we have a union of two units like `boolean`, the
				// undiscriminated compilation will be just as fast
				(this.unitBranches.length === this.branches.length &&
					this.branches.length === 2)
			)
				return this.compileIndiscriminable(js)
			let condition = this.discriminant.optionallyChainedPropString
			if (this.discriminant.kind === "domain")
				condition = `typeof ${condition} === "object" ? ${condition} === null ? "null" : "object" : typeof ${condition} === "function" ? "object" : typeof ${condition}`
			const cases = this.discriminant.cases
			const caseKeys = Object.keys(cases)
			const { optimistic } = js
			js.optimistic = false
			js.block(`switch(${condition})`, () => {
				for (const k in cases) {
					const v = cases[k]
					const caseCondition = k === "default" ? k : `case ${k}`
					js.line(
						`${caseCondition}: return ${
							v === true ?
								optimistic ? js.data
								:	v
							: optimistic ?
								`${js.invoke(v)} ? ${v.contextFreeMorph ? `${registeredReference(v.contextFreeMorph)}(${js.data})` : js.data} : "${unset}"`
							:	js.invoke(v)
						}`
					)
				}
				return js
			})
			if (js.traversalKind === "Allows") {
				js.return(optimistic ? `"${unset}"` : false)
				return
			}
			const expected = describeBranches(
				this.discriminant.kind === "domain" ?
					caseKeys.map(k => {
						const jsTypeOf = k.slice(1, -1)
						return jsTypeOf === "function" ?
								domainDescriptions.object
							:	domainDescriptions[jsTypeOf]
					})
				:	caseKeys
			)
			const serializedPathSegments = this.discriminant.path.map(k =>
				typeof k === "symbol" ? registeredReference(k) : JSON.stringify(k)
			)
			const serializedExpected = JSON.stringify(expected)
			const serializedActual =
				this.discriminant.kind === "domain" ?
					`${serializedTypeOfDescriptions}[${condition}]`
				:	`${serializedPrintable}(${condition})`
			js.line(`ctx.errorFromNodeContext({
	code: "predicate",
	expected: ${serializedExpected},
	actual: ${serializedActual},
	relativePath: [${serializedPathSegments}],
	meta: ${this.compiledMeta}
})`)
		}
		compileIndiscriminable(js) {
			if (js.traversalKind === "Apply") {
				js.const("errors", "[]")
				this.branches.forEach(branch =>
					js
						.line("ctx.pushBranch()")
						.line(js.invoke(branch))
						.if("!ctx.hasError()", () =>
							js.return(
								branch.includesTransform ?
									"ctx.queuedMorphs.push(...ctx.popBranch().queuedMorphs)"
								:	"ctx.popBranch()"
							)
						)
						.line("errors.push(ctx.popBranch().error)")
				)
				js.line(
					`ctx.errorFromNodeContext({ code: "union", errors, meta: ${this.compiledMeta} })`
				)
			} else {
				const { optimistic } = js
				js.optimistic = false
				this.branches.forEach(branch =>
					js.if(`${js.invoke(branch)}`, () =>
						js.return(
							optimistic ?
								branch.contextFreeMorph ?
									`${registeredReference(branch.contextFreeMorph)}(${js.data})`
								:	js.data
							:	true
						)
					)
				)
				js.return(optimistic ? `"${unset}"` : false)
			}
		}
		get nestableExpression() {
			return this.isBoolean ? "boolean" : `(${this.expression})`
		}
		discriminate() {
			if (this.branches.length < 2) return null
			if (this.unitBranches.length === this.branches.length) {
				const cases2 = flatMorph(this.unitBranches, (i, n) => [
					`${n.in.serializedValue}`,
					n.hasKind("morph") ? n : true
				])
				return {
					kind: "unit",
					path: [],
					optionallyChainedPropString: "data",
					cases: cases2
				}
			}
			const candidates = []
			for (let lIndex = 0; lIndex < this.branches.length - 1; lIndex++) {
				const l = this.branches[lIndex]
				for (let rIndex = lIndex + 1; rIndex < this.branches.length; rIndex++) {
					const r = this.branches[rIndex]
					const result = intersectNodesRoot(l.in, r.in, l.$)
					if (!(result instanceof Disjoint)) continue
					for (const entry of result) {
						if (!entry.kind || entry.optional) continue
						let lSerialized
						let rSerialized
						if (entry.kind === "domain") {
							const lValue = entry.l
							const rValue = entry.r
							lSerialized = `"${typeof lValue === "string" ? lValue : lValue.domain}"`
							rSerialized = `"${typeof rValue === "string" ? rValue : rValue.domain}"`
						} else if (entry.kind === "unit") {
							lSerialized = entry.l.serializedValue
							rSerialized = entry.r.serializedValue
						} else continue
						const matching = candidates.find(
							d => arrayEquals(d.path, entry.path) && d.kind === entry.kind
						)
						if (!matching) {
							candidates.push({
								kind: entry.kind,
								cases: {
									[lSerialized]: {
										branchIndices: [lIndex],
										condition: entry.l
									},
									[rSerialized]: {
										branchIndices: [rIndex],
										condition: entry.r
									}
								},
								path: entry.path
							})
						} else {
							if (matching.cases[lSerialized]) {
								matching.cases[lSerialized].branchIndices = appendUnique(
									matching.cases[lSerialized].branchIndices,
									lIndex
								)
							} else {
								matching.cases[lSerialized] ??= {
									branchIndices: [lIndex],
									condition: entry.l
								}
							}
							if (matching.cases[rSerialized]) {
								matching.cases[rSerialized].branchIndices = appendUnique(
									matching.cases[rSerialized].branchIndices,
									rIndex
								)
							} else {
								matching.cases[rSerialized] ??= {
									branchIndices: [rIndex],
									condition: entry.r
								}
							}
						}
					}
				}
			}
			const orderedCandidates =
				this.ordered ? orderCandidates(candidates, this.branches) : candidates
			if (!orderedCandidates.length) return null
			const ctx = createCaseResolutionContext(orderedCandidates, this)
			const cases = {}
			for (const k in ctx.best.cases) {
				const resolution = resolveCase(ctx, k)
				if (resolution === null) {
					cases[k] = true
					continue
				}
				if (resolution.length === this.branches.length) return null
				if (this.ordered) {
					resolution.sort((l, r) => l.originalIndex - r.originalIndex)
				}
				const branches = resolution.map(entry => entry.branch)
				const caseNode =
					branches.length === 1 ?
						branches[0]
					:	this.$.node(
							"union",
							this.ordered ? { branches, ordered: true } : branches
						)
				Object.assign(this.referencesById, caseNode.referencesById)
				cases[k] = caseNode
			}
			if (ctx.defaultEntries.length) {
				const branches = ctx.defaultEntries.map(entry => entry.branch)
				cases.default = this.$.node(
					"union",
					this.ordered ? { branches, ordered: true } : branches,
					{
						prereduced: true
					}
				)
				Object.assign(this.referencesById, cases.default.referencesById)
			}
			return Object.assign(ctx.location, {
				cases
			})
		}
	}
	var createCaseResolutionContext = (orderedCandidates, node2) => {
		const best = orderedCandidates.sort(
			(l, r) => Object.keys(r.cases).length - Object.keys(l.cases).length
		)[0]
		const location = {
			kind: best.kind,
			path: best.path,
			optionallyChainedPropString: optionallyChainPropString(best.path)
		}
		const defaultEntries = node2.branches.map((branch, originalIndex) => ({
			originalIndex,
			branch
		}))
		return {
			best,
			location,
			defaultEntries,
			node: node2
		}
	}
	var resolveCase = (ctx, key) => {
		const caseCtx = ctx.best.cases[key]
		const discriminantNode = discriminantCaseToNode(
			caseCtx.condition,
			ctx.location.path,
			ctx.node.$
		)
		let resolvedEntries = []
		const nextDefaults = []
		for (let i = 0; i < ctx.defaultEntries.length; i++) {
			const entry = ctx.defaultEntries[i]
			if (caseCtx.branchIndices.includes(entry.originalIndex)) {
				const pruned = pruneDiscriminant(
					ctx.node.branches[entry.originalIndex],
					ctx.location
				)
				if (pruned === null) {
					resolvedEntries = null
				} else {
					resolvedEntries?.push({
						originalIndex: entry.originalIndex,
						branch: pruned
					})
				}
			} else if (
				// we shouldn't need a special case for alias to avoid the below
				// once alias resolution issues are improved:
				// https://github.com/arktypeio/arktype/issues/1026
				entry.branch.hasKind("alias") &&
				discriminantNode.hasKind("domain") &&
				discriminantNode.domain === "object"
			)
				resolvedEntries?.push(entry)
			else {
				if (entry.branch.in.overlaps(discriminantNode)) {
					const overlapping = pruneDiscriminant(entry.branch, ctx.location)
					resolvedEntries?.push({
						originalIndex: entry.originalIndex,
						branch: overlapping
					})
				}
				nextDefaults.push(entry)
			}
		}
		ctx.defaultEntries = nextDefaults
		return resolvedEntries
	}
	var orderCandidates = (candidates, originalBranches) => {
		const viableCandidates = candidates.filter(candidate => {
			const caseGroups = Object.values(candidate.cases).map(
				caseCtx => caseCtx.branchIndices
			)
			for (let i = 0; i < caseGroups.length - 1; i++) {
				const currentGroup = caseGroups[i]
				for (let j = i + 1; j < caseGroups.length; j++) {
					const nextGroup = caseGroups[j]
					for (const currentIndex of currentGroup) {
						for (const nextIndex of nextGroup) {
							if (currentIndex > nextIndex) {
								if (
									originalBranches[currentIndex].overlaps(
										originalBranches[nextIndex]
									)
								) {
									return false
								}
							}
						}
					}
				}
			}
			return true
		})
		return viableCandidates
	}
	var discriminantCaseToNode = (caseDiscriminant, path, $) => {
		let node2 =
			caseDiscriminant === "undefined" ? $.node("unit", { unit: void 0 })
			: caseDiscriminant === "null" ? $.node("unit", { unit: null })
			: caseDiscriminant === "boolean" ? $.units([true, false])
			: caseDiscriminant
		for (let i = path.length - 1; i >= 0; i--) {
			const key = path[i]
			node2 = $.node(
				"intersection",
				typeof key === "number" ?
					{
						proto: "Array",
						// create unknown for preceding elements (could be optimized with safe imports)
						sequence: [...range(key).map(_ => ({})), node2]
					}
				:	{
						domain: "object",
						required: [{ key, value: node2 }]
					}
			)
		}
		return node2
	}
	var optionallyChainPropString = path =>
		path.reduce((acc, k) => acc + compileLiteralPropAccess(k, true), "data")
	var serializedTypeOfDescriptions = registeredReference(jsTypeOfDescriptions)
	var serializedPrintable = registeredReference(printable)
	var Union = {
		implementation: implementation17,
		Node: UnionNode
	}
	var discriminantToJson = discriminant => ({
		kind: discriminant.kind,
		path: discriminant.path.map(k =>
			typeof k === "string" ? k : compileSerializedValue(k)
		),
		cases: flatMorph(discriminant.cases, (k, node2) => [
			k,
			node2 === true ? node2
			: node2.hasKind("union") && node2.discriminantJson ?
				node2.discriminantJson
			:	node2.json
		])
	})
	var describeExpressionOptions = {
		delimiter: " | ",
		finalDelimiter: " | "
	}
	var expressBranches = expressions =>
		describeBranches(expressions, describeExpressionOptions)
	var describeBranches = (descriptions, opts) => {
		const delimiter = opts?.delimiter ?? ", "
		const finalDelimiter = opts?.finalDelimiter ?? " or "
		if (descriptions.length === 0) return "never"
		if (descriptions.length === 1) return descriptions[0]
		if (
			(descriptions.length === 2 &&
				descriptions[0] === "false" &&
				descriptions[1] === "true") ||
			(descriptions[0] === "true" && descriptions[1] === "false")
		)
			return "boolean"
		const seen = {}
		const unique = descriptions.filter(s =>
			seen[s] ? false : (seen[s] = true)
		)
		const last = unique.pop()
		return `${unique.join(delimiter)}${unique.length ? finalDelimiter : ""}${last}`
	}
	var intersectBranches = (l, r, ctx) => {
		const batchesByR = r.map(() => [])
		for (let lIndex = 0; lIndex < l.length; lIndex++) {
			let candidatesByR = {}
			for (let rIndex = 0; rIndex < r.length; rIndex++) {
				if (batchesByR[rIndex] === null) {
					continue
				}
				if (l[lIndex].equals(r[rIndex])) {
					batchesByR[rIndex] = null
					candidatesByR = {}
					break
				}
				const branchIntersection = intersectOrPipeNodes(
					l[lIndex],
					r[rIndex],
					ctx
				)
				if (branchIntersection instanceof Disjoint) {
					continue
				}
				if (branchIntersection.equals(l[lIndex])) {
					batchesByR[rIndex].push(l[lIndex])
					candidatesByR = {}
					break
				}
				if (branchIntersection.equals(r[rIndex])) {
					batchesByR[rIndex] = null
				} else {
					candidatesByR[rIndex] = branchIntersection
				}
			}
			for (const rIndex in candidatesByR) {
				batchesByR[rIndex][lIndex] = candidatesByR[rIndex]
			}
		}
		const resultBranches = batchesByR.flatMap(
			// ensure unions returned from branchable intersections like sequence are flattened
			(batch, i) => batch?.flatMap(branch => branch.branches) ?? r[i]
		)
		return resultBranches.length === 0 ?
				Disjoint.init("union", l, r)
			:	resultBranches
	}
	var reduceBranches = ({ branches, ordered }) => {
		if (branches.length < 2) return branches
		const uniquenessByIndex = branches.map(() => true)
		for (let i = 0; i < branches.length; i++) {
			for (
				let j = i + 1;
				j < branches.length && uniquenessByIndex[i] && uniquenessByIndex[j];
				j++
			) {
				if (branches[i].equals(branches[j])) {
					uniquenessByIndex[j] = false
					continue
				}
				const intersection = intersectNodesRoot(
					branches[i].in,
					branches[j].in,
					branches[0].$
				)
				if (intersection instanceof Disjoint) continue
				if (!ordered) assertDeterminateOverlap(branches[i], branches[j])
				if (intersection.equals(branches[i].in)) {
					uniquenessByIndex[i] = !!ordered
				} else if (intersection.equals(branches[j].in))
					uniquenessByIndex[j] = false
			}
		}
		return branches.filter((_, i) => uniquenessByIndex[i])
	}
	var assertDeterminateOverlap = (l, r) => {
		if (!l.includesTransform && !r.includesTransform) return
		if (!arrayEquals(l.shallowMorphs, r.shallowMorphs)) {
			throwParseError(
				writeIndiscriminableMorphMessage(l.expression, r.expression)
			)
		}
		if (
			!arrayEquals(l.flatMorphs, r.flatMorphs, {
				isEqual: (l2, r2) =>
					l2.propString === r2.propString &&
					(l2.node.hasKind("morph") && r2.node.hasKind("morph") ?
						l2.node.hasEqualMorphs(r2.node)
					: l2.node.hasKind("intersection") && r2.node.hasKind("intersection") ?
						l2.node.structure?.structuralMorphRef ===
						r2.node.structure?.structuralMorphRef
					:	false)
			})
		) {
			throwParseError(
				writeIndiscriminableMorphMessage(l.expression, r.expression)
			)
		}
	}
	var pruneDiscriminant = (discriminantBranch, discriminantCtx) =>
		discriminantBranch.transform(
			(nodeKind, inner) => {
				if (nodeKind === "domain" || nodeKind === "unit") return null
				return inner
			},
			{
				shouldTransform: (node2, ctx) => {
					const propString = optionallyChainPropString(ctx.path)
					if (
						!discriminantCtx.optionallyChainedPropString.startsWith(propString)
					)
						return false
					if (node2.hasKind("domain") && node2.domain === "object") return true
					if (
						(node2.hasKind("domain") || discriminantCtx.kind === "unit") &&
						propString === discriminantCtx.optionallyChainedPropString
					)
						return true
					return node2.children.length !== 0 && node2.kind !== "index"
				}
			}
		)
	var writeIndiscriminableMorphMessage = (
		lDescription,
		rDescription
	) => `An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`
	var writeOrderedIntersectionMessage = (
		lDescription,
		rDescription
	) => `The intersection of two ordered unions is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`

	// ../schema/out/roots/unit.js
	var implementation18 = implementNode({
		kind: "unit",
		hasAssociatedError: true,
		keys: {
			unit: {
				preserveUndefined: true,
				serialize: schema2 =>
					schema2 instanceof Date ?
						schema2.toISOString()
					:	defaultValueSerializer(schema2)
			}
		},
		normalize: schema2 => schema2,
		defaults: {
			description: node2 => printable(node2.unit),
			problem: ({ expected, actual }) =>
				`${expected === actual ? `must be reference equal to ${expected} (serialized to the same value)` : `must be ${expected} (was ${actual})`}`
		},
		intersections: {
			unit: (l, r) => Disjoint.init("unit", l, r),
			...defineRightwardIntersections("unit", (l, r) => {
				if (r.allows(l.unit)) return l
				const rBasis = r.hasKind("intersection") ? r.basis : r
				if (rBasis) {
					const rDomain =
						rBasis.hasKind("domain") ? rBasis : $ark.intrinsic.object
					if (l.domain !== rDomain.domain) {
						const lDomainDisjointValue =
							(
								l.domain === "undefined" ||
								l.domain === "null" ||
								l.domain === "boolean"
							) ?
								l.domain
							:	$ark.intrinsic[l.domain]
						return Disjoint.init("domain", lDomainDisjointValue, rDomain)
					}
				}
				return Disjoint.init(
					"assignability",
					l,
					r.hasKind("intersection") ?
						r.children.find(rConstraint => !rConstraint.allows(l.unit))
					:	r
				)
			})
		}
	})
	var UnitNode = class extends InternalBasis {
		compiledValue = this.json.unit
		serializedValue =
			typeof this.unit === "string" || this.unit instanceof Date ?
				JSON.stringify(this.compiledValue)
			:	`${this.compiledValue}`
		compiledCondition = compileEqualityCheck(this.unit, this.serializedValue)
		compiledNegation = compileEqualityCheck(
			this.unit,
			this.serializedValue,
			"negated"
		)
		expression = printable(this.unit)
		domain = domainOf(this.unit)
		get defaultShortDescription() {
			return this.domain === "object" ?
					domainDescriptions.object
				:	this.description
		}
		innerToJsonSchema() {
			return $ark.intrinsic.jsonPrimitive.allows(this.unit) ?
					{ const: this.unit }
				:	JsonSchema.throwUnjsonifiableError(this.defaultShortDescription)
		}
		traverseAllows =
			this.unit instanceof Date ?
				data =>
					data instanceof Date && data.toISOString() === this.compiledValue
			: Number.isNaN(this.unit) ? data => Number.isNaN(data)
			: data => data === this.unit
	}
	var Unit = {
		implementation: implementation18,
		Node: UnitNode
	}
	var compileEqualityCheck = (unit, serializedValue, negated) => {
		if (unit instanceof Date) {
			const condition = `data instanceof Date && data.toISOString() === ${serializedValue}`
			return negated ? `!(${condition})` : condition
		}
		if (Number.isNaN(unit)) return `${negated ? "!" : ""}Number.isNaN(data)`
		return `data ${negated ? "!" : "="}== ${serializedValue}`
	}

	// ../schema/out/structure/index.js
	var implementation19 = implementNode({
		kind: "index",
		hasAssociatedError: false,
		intersectionIsOpen: true,
		keys: {
			signature: {
				child: true,
				parse: (schema2, ctx) => {
					const key = ctx.$.parseSchema(schema2)
					if (!key.extends($ark.intrinsic.key)) {
						return throwParseError(
							writeInvalidPropertyKeyMessage(key.expression)
						)
					}
					const enumerableBranches = key.branches.filter(b => b.hasKind("unit"))
					if (enumerableBranches.length) {
						return throwParseError(
							writeEnumerableIndexBranches(
								enumerableBranches.map(b => printable(b.unit))
							)
						)
					}
					return key
				}
			},
			value: {
				child: true,
				parse: (schema2, ctx) => ctx.$.parseSchema(schema2)
			}
		},
		normalize: schema2 => schema2,
		defaults: {
			description: node2 =>
				`[${node2.signature.expression}]: ${node2.value.description}`
		},
		intersections: {
			index: (l, r, ctx) => {
				if (l.signature.equals(r.signature)) {
					const valueIntersection = intersectOrPipeNodes(l.value, r.value, ctx)
					const value2 =
						valueIntersection instanceof Disjoint ?
							$ark.intrinsic.never.internal
						:	valueIntersection
					return ctx.$.node("index", { signature: l.signature, value: value2 })
				}
				if (l.signature.extends(r.signature) && l.value.subsumes(r.value))
					return r
				if (r.signature.extends(l.signature) && r.value.subsumes(l.value))
					return l
				return null
			}
		}
	})
	var IndexNode = class extends BaseConstraint {
		impliedBasis = $ark.intrinsic.object.internal
		expression = `[${this.signature.expression}]: ${this.value.expression}`
		flatRefs = append(
			this.value.flatRefs.map(ref =>
				flatRef([this.signature, ...ref.path], ref.node)
			),
			flatRef([this.signature], this.value)
		)
		traverseAllows = (data, ctx) =>
			stringAndSymbolicEntriesOf(data).every(entry => {
				if (this.signature.traverseAllows(entry[0], ctx)) {
					return traverseKey(
						entry[0],
						() => this.value.traverseAllows(entry[1], ctx),
						ctx
					)
				}
				return true
			})
		traverseApply = (data, ctx) =>
			stringAndSymbolicEntriesOf(data).forEach(entry => {
				if (this.signature.traverseAllows(entry[0], ctx)) {
					traverseKey(
						entry[0],
						() => this.value.traverseApply(entry[1], ctx),
						ctx
					)
				}
			})
		_transform(mapper, ctx) {
			ctx.path.push(this.signature)
			const result = super._transform(mapper, ctx)
			ctx.path.pop()
			return result
		}
		compile() {}
	}
	var Index = {
		implementation: implementation19,
		Node: IndexNode
	}
	var writeEnumerableIndexBranches = keys =>
		`Index keys ${keys.join(", ")} should be specified as named props.`
	var writeInvalidPropertyKeyMessage = indexSchema =>
		`Indexed key definition '${indexSchema}' must be a string or symbol`

	// ../schema/out/structure/required.js
	var implementation20 = implementNode({
		kind: "required",
		hasAssociatedError: true,
		intersectionIsOpen: true,
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema2, ctx) => ctx.$.parseSchema(schema2)
			}
		},
		normalize: schema2 => schema2,
		defaults: {
			description: node2 => `${node2.compiledKey}: ${node2.value.description}`,
			expected: ctx => ctx.missingValueDescription,
			actual: () => "missing"
		},
		intersections: {
			required: intersectProps,
			optional: intersectProps
		}
	})
	var RequiredNode = class extends BaseProp {
		expression = `${this.compiledKey}: ${this.value.expression}`
		errorContext = Object.freeze({
			code: "required",
			missingValueDescription: this.value.defaultShortDescription,
			relativePath: [this.key],
			meta: this.meta
		})
		compiledErrorContext = compileObjectLiteral(this.errorContext)
	}
	var Required = {
		implementation: implementation20,
		Node: RequiredNode
	}

	// ../schema/out/structure/sequence.js
	var implementation21 = implementNode({
		kind: "sequence",
		hasAssociatedError: false,
		collapsibleKey: "variadic",
		keys: {
			prefix: {
				child: true,
				parse: (schema2, ctx) => {
					if (schema2.length === 0) return void 0
					return schema2.map(element => ctx.$.parseSchema(element))
				}
			},
			optionals: {
				child: true,
				parse: (schema2, ctx) => {
					if (schema2.length === 0) return void 0
					return schema2.map(element => ctx.$.parseSchema(element))
				}
			},
			defaultables: {
				child: defaultables => defaultables.map(element => element[0]),
				parse: (defaultables, ctx) => {
					if (defaultables.length === 0) return void 0
					return defaultables.map(element => {
						const node2 = ctx.$.parseSchema(element[0])
						assertDefaultValueAssignability(node2, element[1], null)
						return [node2, element[1]]
					})
				},
				serialize: defaults =>
					defaults.map(element => [
						element[0].collapsibleJson,
						defaultValueSerializer(element[1])
					])
			},
			variadic: {
				child: true,
				parse: (schema2, ctx) => ctx.$.parseSchema(schema2, ctx)
			},
			minVariadicLength: {
				// minVariadicLength is reflected in the id of this node,
				// but not its IntersectionNode parent since it is superceded by the minLength
				// node it implies
				parse: min => (min === 0 ? void 0 : min)
			},
			postfix: {
				child: true,
				parse: (schema2, ctx) => {
					if (schema2.length === 0) return void 0
					return schema2.map(element => ctx.$.parseSchema(element))
				}
			}
		},
		normalize: schema2 => {
			if (typeof schema2 === "string") return { variadic: schema2 }
			if (
				"variadic" in schema2 ||
				"prefix" in schema2 ||
				"defaultables" in schema2 ||
				"optionals" in schema2 ||
				"postfix" in schema2 ||
				"minVariadicLength" in schema2
			) {
				if (schema2.postfix?.length) {
					if (!schema2.variadic)
						return throwParseError(postfixWithoutVariadicMessage)
					if (schema2.optionals?.length || schema2.defaultables?.length)
						return throwParseError(postfixAfterOptionalOrDefaultableMessage)
				}
				if (schema2.minVariadicLength && !schema2.variadic) {
					return throwParseError(
						"minVariadicLength may not be specified without a variadic element"
					)
				}
				return schema2
			}
			return { variadic: schema2 }
		},
		reduce: (raw, $) => {
			let minVariadicLength = raw.minVariadicLength ?? 0
			const prefix = raw.prefix?.slice() ?? []
			const defaultables = raw.defaultables?.slice() ?? []
			const optionals = raw.optionals?.slice() ?? []
			const postfix = raw.postfix?.slice() ?? []
			if (raw.variadic) {
				while (optionals.at(-1)?.equals(raw.variadic)) optionals.pop()
				if (optionals.length === 0 && defaultables.length === 0) {
					while (prefix.at(-1)?.equals(raw.variadic)) {
						prefix.pop()
						minVariadicLength++
					}
				}
				while (postfix[0]?.equals(raw.variadic)) {
					postfix.shift()
					minVariadicLength++
				}
			} else if (optionals.length === 0 && defaultables.length === 0) {
				prefix.push(...postfix.splice(0))
			}
			if (
				// if any variadic adjacent elements were moved to minVariadicLength
				minVariadicLength !== raw.minVariadicLength || // or any postfix elements were moved to prefix
				(raw.prefix && raw.prefix.length !== prefix.length)
			) {
				return $.node(
					"sequence",
					{
						...raw,
						// empty lists will be omitted during parsing
						prefix,
						defaultables,
						optionals,
						postfix,
						minVariadicLength
					},
					{ prereduced: true }
				)
			}
		},
		defaults: {
			description: node2 => {
				if (node2.isVariadicOnly)
					return `${node2.variadic.nestableExpression}[]`
				const innerDescription = node2.tuple
					.map(element =>
						element.kind === "defaultables" ?
							`${element.node.nestableExpression} = ${printable(element.default)}`
						: element.kind === "optionals" ?
							`${element.node.nestableExpression}?`
						: element.kind === "variadic" ?
							`...${element.node.nestableExpression}[]`
						:	element.node.expression
					)
					.join(", ")
				return `[${innerDescription}]`
			}
		},
		intersections: {
			sequence: (l, r, ctx) => {
				const rootState = _intersectSequences({
					l: l.tuple,
					r: r.tuple,
					disjoint: new Disjoint(),
					result: [],
					fixedVariants: [],
					ctx
				})
				const viableBranches =
					rootState.disjoint.length === 0 ?
						[rootState, ...rootState.fixedVariants]
					:	rootState.fixedVariants
				return (
					viableBranches.length === 0 ? rootState.disjoint
					: viableBranches.length === 1 ?
						ctx.$.node(
							"sequence",
							sequenceTupleToInner(viableBranches[0].result)
						)
					:	ctx.$.node(
							"union",
							viableBranches.map(state => ({
								proto: Array,
								sequence: sequenceTupleToInner(state.result)
							}))
						)
				)
			}
			// exactLength, minLength, and maxLength don't need to be defined
			// here since impliedSiblings guarantees they will be added
			// directly to the IntersectionNode parent of the SequenceNode
			// they exist on
		}
	})
	var SequenceNode = class extends BaseConstraint {
		impliedBasis = $ark.intrinsic.Array.internal
		tuple = sequenceInnerToTuple(this.inner)
		prefixLength = this.prefix?.length ?? 0
		defaultablesLength = this.defaultables?.length ?? 0
		optionalsLength = this.optionals?.length ?? 0
		postfixLength = this.postfix?.length ?? 0
		defaultablesAndOptionals = []
		prevariadic = this.tuple.filter(el => {
			if (el.kind === "defaultables" || el.kind === "optionals") {
				this.defaultablesAndOptionals.push(el.node)
				return true
			}
			return el.kind === "prefix"
		})
		variadicOrPostfix = conflatenate(
			this.variadic && [this.variadic],
			this.postfix
		)
		// have to wait until prevariadic and variadicOrPostfix are set to calculate
		flatRefs = this.addFlatRefs()
		addFlatRefs() {
			appendUniqueFlatRefs(
				this.flatRefs,
				this.prevariadic.flatMap((element, i) =>
					append(
						element.node.flatRefs.map(ref =>
							flatRef([`${i}`, ...ref.path], ref.node)
						),
						flatRef([`${i}`], element.node)
					)
				)
			)
			appendUniqueFlatRefs(
				this.flatRefs,
				this.variadicOrPostfix.flatMap(element =>
					// a postfix index can't be directly represented as a type
					// key, so we just use the same matcher for variadic
					append(
						element.flatRefs.map(ref =>
							flatRef(
								[$ark.intrinsic.nonNegativeIntegerString.internal, ...ref.path],
								ref.node
							)
						),
						flatRef([$ark.intrinsic.nonNegativeIntegerString.internal], element)
					)
				)
			)
			return this.flatRefs
		}
		isVariadicOnly = this.prevariadic.length + this.postfixLength === 0
		minVariadicLength = this.inner.minVariadicLength ?? 0
		minLength = this.prefixLength + this.minVariadicLength + this.postfixLength
		minLengthNode =
			this.minLength === 0 ? null : this.$.node("minLength", this.minLength)
		maxLength = this.variadic ? null : this.tuple.length
		maxLengthNode =
			this.maxLength === null ? null : this.$.node("maxLength", this.maxLength)
		impliedSiblings =
			this.minLengthNode ?
				this.maxLengthNode ?
					[this.minLengthNode, this.maxLengthNode]
				:	[this.minLengthNode]
			: this.maxLengthNode ? [this.maxLengthNode]
			: []
		defaultValueMorphs = getDefaultableMorphs(this)
		defaultValueMorphsReference =
			this.defaultValueMorphs.length ?
				registeredReference(this.defaultValueMorphs)
			:	void 0
		elementAtIndex(data, index) {
			if (index < this.prevariadic.length) return this.tuple[index]
			const firstPostfixIndex = data.length - this.postfixLength
			if (index >= firstPostfixIndex)
				return {
					kind: "postfix",
					node: this.postfix[index - firstPostfixIndex]
				}
			return {
				kind: "variadic",
				node:
					this.variadic ??
					throwInternalError(
						`Unexpected attempt to access index ${index} on ${this}`
					)
			}
		}
		// minLength/maxLength should be checked by Intersection before either traversal
		traverseAllows = (data, ctx) => {
			for (let i = 0; i < data.length; i++) {
				if (!this.elementAtIndex(data, i).node.traverseAllows(data[i], ctx))
					return false
			}
			return true
		}
		traverseApply = (data, ctx) => {
			let i = 0
			for (; i < data.length; i++) {
				traverseKey(
					i,
					() => this.elementAtIndex(data, i).node.traverseApply(data[i], ctx),
					ctx
				)
			}
		}
		get element() {
			return this.cacheGetter("element", this.$.node("union", this.children))
		}
		// minLength/maxLength compilation should be handled by Intersection
		compile(js) {
			this.prefix?.forEach((node2, i) =>
				js.traverseKey(`${i}`, `data[${i}]`, node2)
			)
			this.defaultablesAndOptionals.forEach((node2, i) => {
				const dataIndex = `${i + this.prefixLength}`
				js.if(`${dataIndex} >= ${js.data}.length`, () =>
					js.traversalKind === "Allows" ? js.return(true) : js.return()
				)
				js.traverseKey(dataIndex, `data[${dataIndex}]`, node2)
			})
			if (this.variadic) {
				if (this.postfix) {
					js.const(
						"firstPostfixIndex",
						`${js.data}.length${this.postfix ? `- ${this.postfix.length}` : ""}`
					)
				}
				js.for(
					`i < ${this.postfix ? "firstPostfixIndex" : "data.length"}`,
					() => js.traverseKey("i", "data[i]", this.variadic),
					this.prevariadic.length
				)
				this.postfix?.forEach((node2, i) => {
					const keyExpression = `firstPostfixIndex + ${i}`
					js.traverseKey(keyExpression, `data[${keyExpression}]`, node2)
				})
			}
			if (js.traversalKind === "Allows") js.return(true)
		}
		_transform(mapper, ctx) {
			ctx.path.push($ark.intrinsic.nonNegativeIntegerString.internal)
			const result = super._transform(mapper, ctx)
			ctx.path.pop()
			return result
		}
		// this depends on tuple so needs to come after it
		expression = this.description
		reduceJsonSchema(schema2) {
			if (this.prefix)
				schema2.prefixItems = this.prefix.map(node2 => node2.toJsonSchema())
			if (this.optionals) {
				return JsonSchema.throwUnjsonifiableError(
					`Optional tuple element${this.optionalsLength > 1 ? "s" : ""} ${this.optionals.join(", ")}`
				)
			}
			if (this.variadic) {
				schema2.items = this.variadic?.toJsonSchema()
				if (this.minLength) schema2.minItems = this.minLength
				if (this.maxLength) schema2.maxItems = this.maxLength
			} else {
				schema2.items = false
				delete schema2.minItems
				delete schema2.maxItems
			}
			if (this.postfix) {
				return JsonSchema.throwUnjsonifiableError(
					`Postfix tuple element${this.postfixLength > 1 ? "s" : ""} ${this.postfix.join(", ")}`
				)
			}
			return schema2
		}
	}
	var defaultableMorphsCache = {}
	var getDefaultableMorphs = node2 => {
		if (!node2.defaultables) return []
		const morphs = []
		let cacheKey = "["
		const lastDefaultableIndex =
			node2.prefixLength + node2.defaultablesLength - 1
		for (let i = node2.prefixLength; i <= lastDefaultableIndex; i++) {
			const [elementNode, defaultValue] =
				node2.defaultables[i - node2.prefixLength]
			morphs.push(computeDefaultValueMorph(i, elementNode, defaultValue))
			cacheKey += `${i}: ${elementNode.id} = ${defaultValueSerializer(defaultValue)}, `
		}
		cacheKey += "]"
		return (defaultableMorphsCache[cacheKey] ??= morphs)
	}
	var Sequence = {
		implementation: implementation21,
		Node: SequenceNode
	}
	var sequenceInnerToTuple = inner => {
		const tuple = []
		inner.prefix?.forEach(node2 => tuple.push({ kind: "prefix", node: node2 }))
		inner.defaultables?.forEach(([node2, defaultValue]) =>
			tuple.push({ kind: "defaultables", node: node2, default: defaultValue })
		)
		inner.optionals?.forEach(node2 =>
			tuple.push({ kind: "optionals", node: node2 })
		)
		if (inner.variadic) tuple.push({ kind: "variadic", node: inner.variadic })
		inner.postfix?.forEach(node2 =>
			tuple.push({ kind: "postfix", node: node2 })
		)
		return tuple
	}
	var sequenceTupleToInner = tuple =>
		tuple.reduce((result, element) => {
			if (element.kind === "variadic") result.variadic = element.node
			else if (element.kind === "defaultables") {
				result.defaultables = append(result.defaultables, [
					[element.node, element.default]
				])
			} else result[element.kind] = append(result[element.kind], element.node)
			return result
		}, {})
	var postfixAfterOptionalOrDefaultableMessage =
		"A postfix required element cannot follow an optional or defaultable element"
	var postfixWithoutVariadicMessage =
		"A postfix element requires a variadic element"
	var _intersectSequences = s => {
		const [lHead, ...lTail] = s.l
		const [rHead, ...rTail] = s.r
		if (!lHead || !rHead) return s
		const lHasPostfix = lTail.at(-1)?.kind === "postfix"
		const rHasPostfix = rTail.at(-1)?.kind === "postfix"
		const kind =
			lHead.kind === "prefix" || rHead.kind === "prefix" ? "prefix"
			: lHead.kind === "postfix" || rHead.kind === "postfix" ? "postfix"
			: lHead.kind === "variadic" && rHead.kind === "variadic" ? "variadic"
			: lHasPostfix || rHasPostfix ? "prefix"
			: lHead.kind === "defaultables" || rHead.kind === "defaultables" ?
				"defaultables"
			:	"optionals"
		if (lHead.kind === "prefix" && rHead.kind === "variadic" && rHasPostfix) {
			const postfixBranchResult = _intersectSequences({
				...s,
				fixedVariants: [],
				r: rTail.map(element => ({ ...element, kind: "prefix" }))
			})
			if (postfixBranchResult.disjoint.length === 0)
				s.fixedVariants.push(postfixBranchResult)
		} else if (
			rHead.kind === "prefix" &&
			lHead.kind === "variadic" &&
			lHasPostfix
		) {
			const postfixBranchResult = _intersectSequences({
				...s,
				fixedVariants: [],
				l: lTail.map(element => ({ ...element, kind: "prefix" }))
			})
			if (postfixBranchResult.disjoint.length === 0)
				s.fixedVariants.push(postfixBranchResult)
		}
		const result = intersectOrPipeNodes(lHead.node, rHead.node, s.ctx)
		if (result instanceof Disjoint) {
			if (kind === "prefix" || kind === "postfix") {
				s.disjoint.push(
					...result.withPrefixKey(
						// ideally we could handle disjoint paths more precisely here,
						// but not trivial to serialize postfix elements as keys
						kind === "prefix" ? s.result.length : `-${lTail.length + 1}`,
						"required"
					)
				)
				s.result = [...s.result, { kind, node: $ark.intrinsic.never.internal }]
			} else if (kind === "optionals" || kind === "defaultables") {
				return s
			} else {
				return _intersectSequences({
					...s,
					fixedVariants: [],
					// if there were any optional elements, there will be no postfix elements
					// so this mapping will never occur (which would be illegal otherwise)
					l: lTail.map(element => ({ ...element, kind: "prefix" })),
					r: lTail.map(element => ({ ...element, kind: "prefix" }))
				})
			}
		} else if (kind === "defaultables") {
			if (
				lHead.kind === "defaultables" &&
				rHead.kind === "defaultables" &&
				lHead.default !== rHead.default
			) {
				throwParseError(
					writeDefaultIntersectionMessage(lHead.default, rHead.default)
				)
			}
			s.result = [
				...s.result,
				{
					kind,
					node: result,
					default:
						lHead.kind === "defaultables" ? lHead.default
						: rHead.kind === "defaultables" ? rHead.default
						: throwInternalError(
								`Unexpected defaultable intersection from ${lHead.kind} and ${rHead.kind} elements.`
							)
				}
			]
		} else s.result = [...s.result, { kind, node: result }]
		const lRemaining = s.l.length
		const rRemaining = s.r.length
		if (
			lHead.kind !== "variadic" ||
			(lRemaining >= rRemaining &&
				(rHead.kind === "variadic" || rRemaining === 1))
		)
			s.l = lTail
		if (
			rHead.kind !== "variadic" ||
			(rRemaining >= lRemaining &&
				(lHead.kind === "variadic" || lRemaining === 1))
		)
			s.r = rTail
		return _intersectSequences(s)
	}

	// ../schema/out/structure/structure.js
	var createStructuralWriter = childStringProp => node2 => {
		if (node2.props.length || node2.index) {
			const parts = node2.index?.map(index => index[childStringProp]) ?? []
			node2.props.forEach(prop => parts.push(prop[childStringProp]))
			if (node2.undeclared) parts.push(`+ (undeclared): ${node2.undeclared}`)
			const objectLiteralDescription = `{ ${parts.join(", ")} }`
			return node2.sequence ?
					`${objectLiteralDescription} & ${node2.sequence.description}`
				:	objectLiteralDescription
		}
		return node2.sequence?.description ?? "{}"
	}
	var structuralDescription = createStructuralWriter("description")
	var structuralExpression = createStructuralWriter("expression")
	var implementation22 = implementNode({
		kind: "structure",
		hasAssociatedError: false,
		normalize: schema2 => schema2,
		applyConfig: (schema2, config) => {
			if (!schema2.undeclared && config.onUndeclaredKey !== "ignore") {
				return {
					...schema2,
					undeclared: config.onUndeclaredKey
				}
			}
			return schema2
		},
		keys: {
			required: {
				child: true,
				parse: constraintKeyParser("required"),
				reduceIo: (ioKind, inner, nodes) => {
					inner.required = append(
						inner.required,
						nodes.map(node2 => node2[ioKind])
					)
					return
				}
			},
			optional: {
				child: true,
				parse: constraintKeyParser("optional"),
				reduceIo: (ioKind, inner, nodes) => {
					if (ioKind === "in") {
						inner.optional = nodes.map(node2 => node2.in)
						return
					}
					nodes.forEach(
						node2 =>
							(inner[node2.outProp.kind] = append(
								inner[node2.outProp.kind],
								node2.outProp.out
							))
					)
				}
			},
			index: {
				child: true,
				parse: constraintKeyParser("index")
			},
			sequence: {
				child: true,
				parse: constraintKeyParser("sequence")
			},
			undeclared: {
				parse: behavior => (behavior === "ignore" ? void 0 : behavior),
				reduceIo: (ioKind, inner, value2) => {
					if (value2 !== "delete") return
					if (ioKind === "in") delete inner.undeclared
					else inner.undeclared = "reject"
				}
			}
		},
		defaults: {
			description: structuralDescription
		},
		intersections: {
			structure: (l, r, ctx) => {
				const lInner = { ...l.inner }
				const rInner = { ...r.inner }
				const disjointResult = new Disjoint()
				if (l.undeclared) {
					const lKey = l.keyof()
					r.requiredKeys.forEach(k => {
						if (!lKey.allows(k)) {
							disjointResult.add(
								"presence",
								$ark.intrinsic.never.internal,
								r.propsByKey[k].value,
								{
									path: [k]
								}
							)
						}
					})
					if (rInner.optional)
						rInner.optional = rInner.optional.filter(n => lKey.allows(n.key))
					if (rInner.index) {
						rInner.index = rInner.index.flatMap(n => {
							if (n.signature.extends(lKey)) return n
							const indexOverlap = intersectNodesRoot(lKey, n.signature, ctx.$)
							if (indexOverlap instanceof Disjoint) return []
							const normalized = normalizeIndex(indexOverlap, n.value, ctx.$)
							if (normalized.required) {
								rInner.required = conflatenate(
									rInner.required,
									normalized.required
								)
							}
							if (normalized.optional) {
								rInner.optional = conflatenate(
									rInner.optional,
									normalized.optional
								)
							}
							return normalized.index ?? []
						})
					}
				}
				if (r.undeclared) {
					const rKey = r.keyof()
					l.requiredKeys.forEach(k => {
						if (!rKey.allows(k)) {
							disjointResult.add(
								"presence",
								l.propsByKey[k].value,
								$ark.intrinsic.never.internal,
								{
									path: [k]
								}
							)
						}
					})
					if (lInner.optional)
						lInner.optional = lInner.optional.filter(n => rKey.allows(n.key))
					if (lInner.index) {
						lInner.index = lInner.index.flatMap(n => {
							if (n.signature.extends(rKey)) return n
							const indexOverlap = intersectNodesRoot(rKey, n.signature, ctx.$)
							if (indexOverlap instanceof Disjoint) return []
							const normalized = normalizeIndex(indexOverlap, n.value, ctx.$)
							if (normalized.required) {
								lInner.required = conflatenate(
									lInner.required,
									normalized.required
								)
							}
							if (normalized.optional) {
								lInner.optional = conflatenate(
									lInner.optional,
									normalized.optional
								)
							}
							return normalized.index ?? []
						})
					}
				}
				const baseInner = {}
				if (l.undeclared || r.undeclared) {
					baseInner.undeclared =
						l.undeclared === "reject" || r.undeclared === "reject" ?
							"reject"
						:	"delete"
				}
				const childIntersectionResult = intersectConstraints({
					kind: "structure",
					baseInner,
					l: flattenConstraints(lInner),
					r: flattenConstraints(rInner),
					roots: [],
					ctx
				})
				if (childIntersectionResult instanceof Disjoint)
					disjointResult.push(...childIntersectionResult)
				if (disjointResult.length) return disjointResult
				return childIntersectionResult
			}
		}
	})
	var StructureNode = class extends BaseConstraint {
		impliedBasis = $ark.intrinsic.object.internal
		impliedSiblings = this.children.flatMap(n => n.impliedSiblings ?? [])
		props = conflatenate(this.required, this.optional)
		propsByKey = flatMorph(this.props, (i, node2) => [node2.key, node2])
		propsByKeyReference = registeredReference(this.propsByKey)
		expression = structuralExpression(this)
		requiredKeys = this.required?.map(node2 => node2.key) ?? []
		optionalKeys = this.optional?.map(node2 => node2.key) ?? []
		literalKeys = [...this.requiredKeys, ...this.optionalKeys]
		_keyof
		keyof() {
			if (this._keyof) return this._keyof
			let branches = this.$.units(this.literalKeys).branches
			this.index?.forEach(({ signature }) => {
				branches = branches.concat(signature.branches)
			})
			return (this._keyof = this.$.node("union", branches))
		}
		map(flatMapProp) {
			return this.$.node(
				"structure",
				this.props.flatMap(flatMapProp).reduce((structureInner, mapped) => {
					const originalProp = this.propsByKey[mapped.key]
					if (isNode(mapped)) {
						if (mapped.kind !== "required" && mapped.kind !== "optional") {
							return throwParseError(
								`Map result must have kind "required" or "optional" (was ${mapped.kind})`
							)
						}
						structureInner[mapped.kind] = append(
							structureInner[mapped.kind],
							mapped
						)
						return structureInner
					}
					const mappedKind = mapped.kind ?? originalProp?.kind ?? "required"
					const mappedPropInner = flatMorph(mapped, (k, v) =>
						k in Optional.implementation.keys ? [k, v] : []
					)
					structureInner[mappedKind] = append(
						structureInner[mappedKind],
						this.$.node(mappedKind, mappedPropInner)
					)
					return structureInner
				}, {})
			)
		}
		assertHasKeys(keys) {
			const invalidKeys = keys.filter(k => !typeOrTermExtends(k, this.keyof()))
			if (invalidKeys.length) {
				return throwParseError(
					writeInvalidKeysMessage(this.expression, invalidKeys)
				)
			}
		}
		get(indexer, ...path) {
			let value2
			let required = false
			const key = indexerToKey(indexer)
			if (
				(typeof key === "string" || typeof key === "symbol") &&
				this.propsByKey[key]
			) {
				value2 = this.propsByKey[key].value
				required = this.propsByKey[key].required
			}
			this.index?.forEach(n => {
				if (typeOrTermExtends(key, n.signature))
					value2 = value2?.and(n.value) ?? n.value
			})
			if (
				this.sequence &&
				typeOrTermExtends(key, $ark.intrinsic.nonNegativeIntegerString)
			) {
				if (hasArkKind(key, "root")) {
					if (this.sequence.variadic)
						value2 = value2?.and(this.sequence.element) ?? this.sequence.element
				} else {
					const index = Number.parseInt(key)
					if (index < this.sequence.prevariadic.length) {
						const fixedElement = this.sequence.prevariadic[index].node
						value2 = value2?.and(fixedElement) ?? fixedElement
						required ||= index < this.sequence.prefixLength
					} else if (this.sequence.variadic) {
						const nonFixedElement = this.$.node(
							"union",
							this.sequence.variadicOrPostfix
						)
						value2 = value2?.and(nonFixedElement) ?? nonFixedElement
					}
				}
			}
			if (!value2) {
				if (
					this.sequence?.variadic &&
					hasArkKind(key, "root") &&
					key.extends($ark.intrinsic.number)
				) {
					return throwParseError(
						writeNumberIndexMessage(key.expression, this.sequence.expression)
					)
				}
				return throwParseError(writeInvalidKeysMessage(this.expression, [key]))
			}
			const result = value2.get(...path)
			return required ? result : result.or($ark.intrinsic.undefined)
		}
		pick(...keys) {
			this.assertHasKeys(keys)
			return this.$.node("structure", this.filterKeys("pick", keys))
		}
		omit(...keys) {
			this.assertHasKeys(keys)
			return this.$.node("structure", this.filterKeys("omit", keys))
		}
		optionalize() {
			const { required, ...inner } = this.inner
			return this.$.node("structure", {
				...inner,
				optional: this.props.map(prop =>
					prop.hasKind("required") ? this.$.node("optional", prop.inner) : prop
				)
			})
		}
		require() {
			const { optional, ...inner } = this.inner
			return this.$.node("structure", {
				...inner,
				required: this.props.map(prop =>
					prop.hasKind("optional") ?
						{
							key: prop.key,
							value: prop.value
						}
					:	prop
				)
			})
		}
		merge(r) {
			const inner = this.filterKeys("omit", [r.keyof()])
			if (r.required) inner.required = append(inner.required, r.required)
			if (r.optional) inner.optional = append(inner.optional, r.optional)
			if (r.index) inner.index = append(inner.index, r.index)
			if (r.sequence) inner.sequence = r.sequence
			if (r.undeclared) inner.undeclared = r.undeclared
			else delete inner.undeclared
			return this.$.node("structure", inner)
		}
		filterKeys(operation, keys) {
			const result = makeRootAndArrayPropertiesMutable(this.inner)
			const shouldKeep = key => {
				const matchesKey = keys.some(k => typeOrTermExtends(key, k))
				return operation === "pick" ? matchesKey : !matchesKey
			}
			if (result.required)
				result.required = result.required.filter(prop => shouldKeep(prop.key))
			if (result.optional)
				result.optional = result.optional.filter(prop => shouldKeep(prop.key))
			if (result.index)
				result.index = result.index.filter(index => shouldKeep(index.signature))
			return result
		}
		traverseAllows = (data, ctx) => this._traverse("Allows", data, ctx)
		traverseApply = (data, ctx) => this._traverse("Apply", data, ctx)
		_traverse = (traversalKind, data, ctx) => {
			const errorCount = ctx?.currentErrorCount ?? 0
			for (let i = 0; i < this.props.length; i++) {
				if (traversalKind === "Allows") {
					if (!this.props[i].traverseAllows(data, ctx)) return false
				} else {
					this.props[i].traverseApply(data, ctx)
					if (ctx.failFast && ctx.currentErrorCount > errorCount) return false
				}
			}
			if (this.sequence) {
				if (traversalKind === "Allows") {
					if (!this.sequence.traverseAllows(data, ctx)) return false
				} else {
					this.sequence.traverseApply(data, ctx)
					if (ctx.failFast && ctx.currentErrorCount > errorCount) return false
				}
			}
			if (this.index || this.undeclared === "reject") {
				const keys = Object.keys(data)
				keys.push(...Object.getOwnPropertySymbols(data))
				for (let i = 0; i < keys.length; i++) {
					const k = keys[i]
					if (this.index) {
						for (const node2 of this.index) {
							if (node2.signature.traverseAllows(k, ctx)) {
								if (traversalKind === "Allows") {
									const result = traverseKey(
										k,
										() => node2.value.traverseAllows(data[k], ctx),
										ctx
									)
									if (!result) return false
								} else {
									traverseKey(
										k,
										() => node2.value.traverseApply(data[k], ctx),
										ctx
									)
									if (ctx.failFast && ctx.currentErrorCount > errorCount)
										return false
								}
							}
						}
					}
					if (this.undeclared === "reject" && !this.declaresKey(k)) {
						if (traversalKind === "Allows") return false
						ctx.errorFromNodeContext({
							// TODO: this should have its own error code
							code: "predicate",
							expected: "removed",
							actual: "",
							relativePath: [k],
							meta: this.meta
						})
						if (ctx.failFast) return false
					}
				}
			}
			if (this.structuralMorph && ctx && !ctx.hasError())
				ctx.queueMorphs([this.structuralMorph])
			return true
		}
		get defaultable() {
			return this.cacheGetter(
				"defaultable",
				this.optional?.filter(o => o.hasDefault()) ?? []
			)
		}
		declaresKey = k =>
			k in this.propsByKey ||
			this.index?.some(n => n.signature.allows(k)) ||
			(this.sequence !== void 0 &&
				$ark.intrinsic.nonNegativeIntegerString.allows(k))
		_compileDeclaresKey(js) {
			const parts = []
			if (this.props.length) parts.push(`k in ${this.propsByKeyReference}`)
			this.index?.forEach(index =>
				parts.push(js.invoke(index.signature, { kind: "Allows", arg: "k" }))
			)
			if (this.sequence)
				parts.push("$ark.intrinsic.nonNegativeIntegerString.allows(k)")
			return parts.join(" || ") || "false"
		}
		get structuralMorph() {
			return this.cacheGetter("structuralMorph", getPossibleMorph(this))
		}
		structuralMorphRef =
			this.structuralMorph && registeredReference(this.structuralMorph)
		compile(js) {
			if (js.traversalKind === "Apply") js.initializeErrorCount()
			this.props.forEach(prop => {
				js.check(prop)
				if (js.traversalKind === "Apply") js.returnIfFailFast()
			})
			if (this.sequence) {
				js.check(this.sequence)
				if (js.traversalKind === "Apply") js.returnIfFailFast()
			}
			if (this.index || this.undeclared === "reject") {
				js.const("keys", "Object.keys(data)")
				js.line("keys.push(...Object.getOwnPropertySymbols(data))")
				js.for("i < keys.length", () => this.compileExhaustiveEntry(js))
			}
			if (js.traversalKind === "Allows") return js.return(true)
			if (this.structuralMorphRef) {
				js.if("ctx && !ctx.hasError()", () => {
					js.line(`ctx.queueMorphs([`)
					precompileMorphs(js, this)
					return js.line("])")
				})
			}
		}
		compileExhaustiveEntry(js) {
			js.const("k", "keys[i]")
			this.index?.forEach(node2 => {
				js.if(
					`${js.invoke(node2.signature, { arg: "k", kind: "Allows" })}`,
					() => js.traverseKey("k", "data[k]", node2.value)
				)
			})
			if (this.undeclared === "reject") {
				js.if(`!(${this._compileDeclaresKey(js)})`, () => {
					if (js.traversalKind === "Allows") return js.return(false)
					return js
						.line(
							// TODO: should have its own error code
							`ctx.errorFromNodeContext({ code: "predicate", expected: "removed", actual: "", relativePath: [k], meta: ${this.compiledMeta} })`
						)
						.if("ctx.failFast", () => js.return())
				})
			}
			return js
		}
		reduceJsonSchema(schema2) {
			switch (schema2.type) {
				case "object":
					return this.reduceObjectJsonSchema(schema2)
				case "array":
					if (this.props.length || this.index) {
						return JsonSchema.throwUnjsonifiableError(
							`Additional properties on array ${this.expression}`
						)
					}
					return this.sequence?.reduceJsonSchema(schema2) ?? schema2
				default:
					return JsonSchema.throwInternalOperandError("structure", schema2)
			}
		}
		reduceObjectJsonSchema(schema2) {
			if (this.props.length) {
				schema2.properties = {}
				this.props.forEach(prop => {
					if (typeof prop.key === "symbol") {
						return JsonSchema.throwUnjsonifiableError(
							`Symbolic key ${prop.serializedKey}`
						)
					}
					schema2.properties[prop.key] = prop.value.toJsonSchema()
				})
				if (this.requiredKeys.length) schema2.required = this.requiredKeys
			}
			this.index?.forEach(index => {
				if (index.signature.equals($ark.intrinsic.string))
					return (schema2.additionalProperties = index.value.toJsonSchema())
				if (!index.signature.extends($ark.intrinsic.string)) {
					return JsonSchema.throwUnjsonifiableError(
						`Symbolic index signature ${index.signature.exclude($ark.intrinsic.string)}`
					)
				}
				index.signature.branches.forEach(keyBranch => {
					if (
						!keyBranch.hasKind("intersection") ||
						keyBranch.inner.pattern?.length !== 1
					) {
						return JsonSchema.throwUnjsonifiableError(
							`Index signature ${keyBranch}`
						)
					}
					schema2.patternProperties ??= {}
					schema2.patternProperties[keyBranch.inner.pattern[0].rule] =
						index.value.toJsonSchema()
				})
			})
			if (this.undeclared && !schema2.additionalProperties)
				schema2.additionalProperties = false
			return schema2
		}
	}
	var defaultableMorphsCache2 = {}
	var constructStructuralMorphCacheKey = node2 => {
		let cacheKey = ""
		for (let i = 0; i < node2.defaultable.length; i++)
			cacheKey += node2.defaultable[i].defaultValueMorphRef
		if (node2.sequence?.defaultValueMorphsReference)
			cacheKey += node2.sequence?.defaultValueMorphsReference
		if (node2.undeclared === "delete") {
			cacheKey += "delete !("
			node2.required?.forEach(n => (cacheKey += n.compiledKey + " | "))
			node2.optional?.forEach(n => (cacheKey += n.compiledKey + " | "))
			node2.index?.forEach(index => (cacheKey += index.signature.id + " | "))
			if (node2.sequence) {
				if (node2.sequence.maxLength === null)
					cacheKey += intrinsic.nonNegativeIntegerString.id
				else {
					cacheKey += node2.sequence.tuple.forEach(
						(_, i) => (cacheKey += i + " | ")
					)
				}
			}
			cacheKey += ")"
		}
		return cacheKey
	}
	var getPossibleMorph = node2 => {
		const cacheKey = constructStructuralMorphCacheKey(node2)
		if (!cacheKey) return void 0
		if (defaultableMorphsCache2[cacheKey])
			return defaultableMorphsCache2[cacheKey]
		const $arkStructuralMorph = (data, ctx) => {
			for (let i = 0; i < node2.defaultable.length; i++) {
				if (!(node2.defaultable[i].key in data))
					node2.defaultable[i].defaultValueMorph(data, ctx)
			}
			if (node2.sequence?.defaultables) {
				for (
					let i = data.length - node2.sequence.prefixLength;
					i < node2.sequence.defaultables.length;
					i++
				)
					node2.sequence.defaultValueMorphs[i](data, ctx)
			}
			if (node2.undeclared === "delete") {
				for (const k in data) if (!node2.declaresKey(k)) delete data[k]
			}
			return data
		}
		return (defaultableMorphsCache2[cacheKey] = $arkStructuralMorph)
	}
	var precompileMorphs = (js, node2) => {
		const requiresContext =
			node2.defaultable.some(node3 => node3.defaultValueMorph.length === 2) ||
			node2.sequence?.defaultValueMorphs.some(morph => morph.length === 2)
		const args2 = `(data${requiresContext ? ", ctx" : ""})`
		return js.block(`${args2} => `, js2 => {
			for (let i = 0; i < node2.defaultable.length; i++) {
				const { serializedKey, defaultValueMorphRef } = node2.defaultable[i]
				js2.if(`!(${serializedKey} in data)`, js3 =>
					js3.line(`${defaultValueMorphRef}${args2}`)
				)
			}
			if (node2.sequence?.defaultables) {
				js2.for(
					`i < ${node2.sequence.defaultables.length}`,
					js3 => js3.set(`data[i]`, 5),
					`data.length - ${node2.sequence.prefixLength}`
				)
			}
			if (node2.undeclared === "delete") {
				js2.forIn("data", js3 =>
					js3.if(`!(${node2._compileDeclaresKey(js3)})`, js4 =>
						js4.line(`delete data[k]`)
					)
				)
			}
			return js2.return("data")
		})
	}
	var Structure = {
		implementation: implementation22,
		Node: StructureNode
	}
	var indexerToKey = indexable => {
		if (hasArkKind(indexable, "root") && indexable.hasKind("unit"))
			indexable = indexable.unit
		if (typeof indexable === "number") indexable = `${indexable}`
		return indexable
	}
	var writeNumberIndexMessage = (indexExpression, sequenceExpression) =>
		`${indexExpression} is not allowed as an array index on ${sequenceExpression}. Use the 'nonNegativeIntegerString' keyword instead.`
	var normalizeIndex = (signature, value2, $) => {
		const [enumerableBranches, nonEnumerableBranches] = spliterate(
			signature.branches,
			k => k.hasKind("unit")
		)
		if (!enumerableBranches.length)
			return { index: $.node("index", { signature, value: value2 }) }
		const normalized = {}
		enumerableBranches.forEach(n => {
			const prop = $.node("required", { key: n.unit, value: value2 })
			normalized[prop.kind] = append(normalized[prop.kind], prop)
		})
		if (nonEnumerableBranches.length) {
			normalized.index = $.node("index", {
				signature: nonEnumerableBranches,
				value: value2
			})
		}
		return normalized
	}
	var typeKeyToString = k =>
		hasArkKind(k, "root") ? k.expression : printable(k)
	var writeInvalidKeysMessage = (o, keys) =>
		`Key${keys.length === 1 ? "" : "s"} ${keys.map(typeKeyToString).join(", ")} ${keys.length === 1 ? "does" : "do"} not exist on ${o}`

	// ../schema/out/kinds.js
	var nodeImplementationsByKind = {
		...boundImplementationsByKind,
		alias: Alias.implementation,
		domain: Domain.implementation,
		unit: Unit.implementation,
		proto: Proto.implementation,
		union: Union.implementation,
		morph: Morph.implementation,
		intersection: Intersection.implementation,
		divisor: Divisor.implementation,
		pattern: Pattern.implementation,
		predicate: Predicate.implementation,
		required: Required.implementation,
		optional: Optional.implementation,
		index: Index.implementation,
		sequence: Sequence.implementation,
		structure: Structure.implementation
	}
	$ark.defaultConfig = withAlphabetizedKeys(
		Object.assign(
			flatMorph(nodeImplementationsByKind, (kind, implementation23) => [
				kind,
				implementation23.defaults
			]),
			{
				jitless: envHasCsp(),
				clone: deepClone,
				onUndeclaredKey: "ignore",
				exactOptionalPropertyTypes: true,
				numberAllowsNaN: false,
				dateAllowsInvalid: false,
				onFail: null,
				keywords: {}
			}
		)
	)
	$ark.resolvedConfig = mergeConfigs($ark.defaultConfig, $ark.config)
	var nodeClassesByKind = {
		...boundClassesByKind,
		alias: Alias.Node,
		domain: Domain.Node,
		unit: Unit.Node,
		proto: Proto.Node,
		union: Union.Node,
		morph: Morph.Node,
		intersection: Intersection.Node,
		divisor: Divisor.Node,
		pattern: Pattern.Node,
		predicate: Predicate.Node,
		required: Required.Node,
		optional: Optional.Node,
		index: Index.Node,
		sequence: Sequence.Node,
		structure: Structure.Node
	}

	// ../schema/out/module.js
	var RootModule = class extends DynamicBase {
		// ensure `[arkKind]` is non-enumerable so it doesn't get spread on import/export
		get [arkKind]() {
			return "module"
		}
	}
	var bindModule = (module, $) =>
		new RootModule(
			flatMorph(module, (alias, value2) => [
				alias,
				hasArkKind(value2, "module") ?
					bindModule(value2, $)
				:	$.bindReference(value2)
			])
		)

	// ../schema/out/scope.js
	var schemaBranchesOf = schema2 =>
		isArray(schema2) ? schema2
		: "branches" in schema2 && isArray(schema2.branches) ? schema2.branches
		: void 0
	var throwMismatchedNodeRootError = (expected, actual) =>
		throwParseError(
			`Node of kind ${actual} is not valid as a ${expected} definition`
		)
	var writeDuplicateAliasError = alias =>
		`#${alias} duplicates public alias ${alias}`
	var scopesByName = {}
	$ark.ambient ??= {}
	var rawUnknownUnion
	var rootScopeFnName = "function $"
	var precompile = references =>
		bindPrecompilation(references, precompileReferences(references))
	var bindPrecompilation = (references, precompiler) => {
		const precompilation = precompiler.write(rootScopeFnName)
		const compiledTraversals = precompiler.compile()()
		for (const node2 of references) {
			if (node2.precompilation) {
				continue
			}
			node2.traverseAllows =
				compiledTraversals[`${node2.id}Allows`].bind(compiledTraversals)
			if (node2.isRoot() && !node2.allowsRequiresContext) {
				node2.allows = node2.traverseAllows
			}
			node2.traverseApply =
				compiledTraversals[`${node2.id}Apply`].bind(compiledTraversals)
			if (compiledTraversals[`${node2.id}Optimistic`]) {
				node2.traverseOptimistic =
					compiledTraversals[`${node2.id}Optimistic`].bind(compiledTraversals)
			}
			node2.precompilation = precompilation
		}
	}
	var precompileReferences = references =>
		new CompiledFunction().return(
			references.reduce((js, node2) => {
				const allowsCompiler = new NodeCompiler({ kind: "Allows" }).indent()
				node2.compile(allowsCompiler)
				const allowsJs = allowsCompiler.write(`${node2.id}Allows`)
				const applyCompiler = new NodeCompiler({ kind: "Apply" }).indent()
				node2.compile(applyCompiler)
				const applyJs = applyCompiler.write(`${node2.id}Apply`)
				const result = `${js}${allowsJs},
${applyJs},
`
				if (!node2.hasKind("union")) return result
				const optimisticCompiler = new NodeCompiler({
					kind: "Allows",
					optimistic: true
				}).indent()
				node2.compile(optimisticCompiler)
				const optimisticJs = optimisticCompiler.write(`${node2.id}Optimistic`)
				return `${result}${optimisticJs},
`
			}, "{\n") + "}"
		)
	var BaseScope = class {
		config
		resolvedConfig
		name
		get [arkKind]() {
			return "scope"
		}
		referencesById = {}
		references = []
		resolutions = {}
		exportedNames = []
		aliases = {}
		resolved = false
		nodesByHash = {}
		intrinsic
		constructor(def, config) {
			this.config = mergeConfigs($ark.config, config)
			this.resolvedConfig = mergeConfigs($ark.resolvedConfig, config)
			this.name =
				this.resolvedConfig.name ??
				`anonymousScope${Object.keys(scopesByName).length}`
			if (this.name in scopesByName)
				throwParseError(`A Scope already named ${this.name} already exists`)
			scopesByName[this.name] = this
			const aliasEntries = Object.entries(def).map(entry =>
				this.preparseOwnAliasEntry(...entry)
			)
			aliasEntries.forEach(([k, v]) => {
				let name = k
				if (k[0] === "#") {
					name = k.slice(1)
					if (name in this.aliases)
						throwParseError(writeDuplicateAliasError(name))
					this.aliases[name] = v
				} else {
					if (name in this.aliases) throwParseError(writeDuplicateAliasError(k))
					this.aliases[name] = v
					this.exportedNames.push(name)
				}
				if (
					!hasArkKind(v, "module") &&
					!hasArkKind(v, "generic") && // TODO: proto thunk defs?
					!isThunk(v)
				) {
					const preparsed = this.preparseOwnDefinitionFormat(v, { alias: name })
					if (hasArkKind(preparsed, "root"))
						this.resolutions[name] = this.bindReference(preparsed)
					else this.resolutions[name] = this.createParseContext(preparsed).id
				}
			})
			rawUnknownUnion ??= this.node(
				"union",
				{
					branches: [
						"string",
						"number",
						"object",
						"bigint",
						"symbol",
						{ unit: true },
						{ unit: false },
						{ unit: void 0 },
						{ unit: null }
					]
				},
				{ prereduced: true }
			)
			this.nodesByHash[rawUnknownUnion.hash] = this.node(
				"intersection",
				{},
				{ prereduced: true }
			)
			this.intrinsic =
				$ark.intrinsic ?
					flatMorph($ark.intrinsic, (k, v) =>
						// don't include cyclic aliases from JSON scope
						k.startsWith("json") ? [] : [k, this.bindReference(v)]
					)
				:	{}
		}
		cacheGetter(name, value2) {
			Object.defineProperty(this, name, { value: value2 })
			return value2
		}
		get internal() {
			return this
		}
		// json is populated when the scope is exported, so ensure it is populated
		// before allowing external access
		_json
		get json() {
			if (!this._json) this.export()
			return this._json
		}
		defineSchema(def) {
			return def
		}
		generic = (...params) => {
			const $ = this
			return (def, possibleHkt) =>
				new GenericRoot(
					params,
					possibleHkt ? new LazyGenericBody(def) : def,
					$,
					$,
					possibleHkt ?? null
				)
		}
		units = (values, opts) => {
			const uniqueValues = []
			for (const value2 of values)
				if (!uniqueValues.includes(value2)) uniqueValues.push(value2)
			const branches = uniqueValues.map(unit =>
				this.node("unit", { unit }, opts)
			)
			return this.node("union", branches, {
				...opts,
				prereduced: true
			})
		}
		lazyResolutions = []
		lazilyResolve(resolve, syntheticAlias) {
			const node2 = this.node(
				"alias",
				{
					reference: syntheticAlias ?? "synthetic",
					resolve
				},
				{ prereduced: true }
			)
			if (!this.resolved) this.lazyResolutions.push(node2)
			return node2
		}
		schema = (schema2, opts) => this.finalize(this.parseSchema(schema2, opts))
		parseSchema = (schema2, opts) =>
			this.node(schemaKindOf(schema2), schema2, opts)
		preparseNode(kinds, schema2, opts) {
			let kind =
				typeof kinds === "string" ? kinds : schemaKindOf(schema2, kinds)
			if (isNode(schema2) && schema2.kind === kind) return schema2
			if (kind === "alias" && !opts?.prereduced) {
				const { reference: reference2 } = Alias.implementation.normalize(
					schema2,
					this
				)
				if (reference2.startsWith("$")) {
					const resolution = this.resolveRoot(reference2.slice(1))
					schema2 = resolution
					kind = resolution.kind
				}
			} else if (kind === "union" && hasDomain(schema2, "object")) {
				const branches = schemaBranchesOf(schema2)
				if (branches?.length === 1) {
					schema2 = branches[0]
					kind = schemaKindOf(schema2)
				}
			}
			if (isNode(schema2) && schema2.kind === kind) return schema2
			const impl = nodeImplementationsByKind[kind]
			const normalizedSchema = impl.normalize?.(schema2, this) ?? schema2
			if (isNode(normalizedSchema)) {
				return normalizedSchema.kind === kind ?
						normalizedSchema
					:	throwMismatchedNodeRootError(kind, normalizedSchema.kind)
			}
			return {
				...opts,
				$: this,
				kind,
				def: normalizedSchema,
				prefix: opts.alias ?? kind
			}
		}
		bindReference(reference2) {
			let bound
			if (isNode(reference2)) {
				bound =
					reference2.$ === this ?
						reference2
					:	new reference2.constructor(reference2.attachments, this)
			} else {
				bound =
					reference2.$ === this ?
						reference2
					:	new GenericRoot(
							reference2.params,
							reference2.bodyDef,
							reference2.$,
							this,
							reference2.hkt
						)
			}
			if (!this.resolved) {
				Object.assign(this.referencesById, bound.referencesById)
			}
			return bound
		}
		resolveRoot(name) {
			return (
				this.maybeResolveRoot(name) ??
				throwParseError(writeUnresolvableMessage(name))
			)
		}
		maybeResolveRoot(name) {
			const result = this.maybeResolve(name)
			if (hasArkKind(result, "generic")) return
			return result
		}
		/** If name is a valid reference to a submodule alias, return its resolution  */
		maybeResolveSubalias(name) {
			return (
				maybeResolveSubalias(this.aliases, name) ??
				maybeResolveSubalias(this.ambient, name)
			)
		}
		get ambient() {
			return $ark.ambient
		}
		maybeResolve(name) {
			const cached2 = this.resolutions[name]
			if (cached2) {
				if (typeof cached2 !== "string") return this.bindReference(cached2)
				const v = nodesByRegisteredId[cached2]
				if (hasArkKind(v, "root")) return (this.resolutions[name] = v)
				if (hasArkKind(v, "context")) {
					if (v.phase === "resolving") {
						return this.node(
							"alias",
							{ reference: `$${name}` },
							{ prereduced: true }
						)
					}
					if (v.phase === "resolved") {
						return throwInternalError(
							`Unexpected resolved context for was uncached by its scope: ${printable(v)}`
						)
					}
					v.phase = "resolving"
					const node2 = this.bindReference(
						this.parseOwnDefinitionFormat(v.def, v)
					)
					v.phase = "resolved"
					nodesByRegisteredId[node2.id] = node2
					nodesByRegisteredId[v.id] = node2
					return (this.resolutions[name] = node2)
				}
				return throwInternalError(
					`Unexpected nodesById entry for ${cached2}: ${printable(v)}`
				)
			}
			let def = this.aliases[name] ?? this.ambient?.[name]
			if (!def) return this.maybeResolveSubalias(name)
			def = this.normalizeRootScopeValue(def)
			if (hasArkKind(def, "generic"))
				return (this.resolutions[name] = this.bindReference(def))
			if (hasArkKind(def, "module")) {
				if (def.root)
					return (this.resolutions[name] = this.bindReference(def.root))
				else return throwParseError(writeMissingSubmoduleAccessMessage(name))
			}
			return (this.resolutions[name] = this.parse(def, {
				alias: name
			}))
		}
		createParseContext(input) {
			const id = input.id ?? registerNodeId(input.prefix)
			return (nodesByRegisteredId[id] = Object.assign(input, {
				[arkKind]: "context",
				$: this,
				id,
				phase: "unresolved"
			}))
		}
		traversal(root) {
			return new Traversal(root, this.resolvedConfig)
		}
		import(...names) {
			return new RootModule(
				flatMorph(this.export(...names), (alias, value2) => [
					`#${alias}`,
					value2
				])
			)
		}
		precompilation
		_exportedResolutions
		_exports
		export(...names) {
			if (!this._exports) {
				this._exports = {}
				for (const name of this.exportedNames) {
					const def = this.aliases[name]
					this._exports[name] =
						hasArkKind(def, "module") ?
							bindModule(def, this)
						:	bootstrapAliasReferences(this.maybeResolve(name))
				}
				this.lazyResolutions.forEach(node2 => node2.resolution)
				this._exportedResolutions = resolutionsOfModule(this, this._exports)
				this._json = resolutionsToJson(this._exportedResolutions)
				Object.assign(this.resolutions, this._exportedResolutions)
				this.references = Object.values(this.referencesById)
				if (!this.resolvedConfig.jitless) {
					const precompiler = precompileReferences(this.references)
					this.precompilation = precompiler.write(rootScopeFnName)
					bindPrecompilation(this.references, precompiler)
				}
				this.resolved = true
			}
			const namesToExport = names.length ? names : this.exportedNames
			return new RootModule(
				flatMorph(namesToExport, (_, name) => [name, this._exports[name]])
			)
		}
		resolve(name) {
			return this.export()[name]
		}
		node = (kinds, nodeSchema, opts = {}) => {
			const ctxOrNode = this.preparseNode(kinds, nodeSchema, opts)
			if (isNode(ctxOrNode)) return this.bindReference(ctxOrNode)
			const ctx = this.createParseContext(ctxOrNode)
			const node2 = parseNode(ctx)
			const bound = this.bindReference(node2)
			return (nodesByRegisteredId[ctx.id] = bound)
		}
		parse = (def, opts = {}) => this.finalize(this.parseDefinition(def, opts))
		parseDefinition(def, opts = {}) {
			if (hasArkKind(def, "root")) return this.bindReference(def)
			const ctxInputOrNode = this.preparseOwnDefinitionFormat(def, opts)
			if (hasArkKind(ctxInputOrNode, "root"))
				return this.bindReference(ctxInputOrNode)
			const ctx = this.createParseContext(ctxInputOrNode)
			nodesByRegisteredId[ctx.id] = ctx
			let node2 = this.bindReference(this.parseOwnDefinitionFormat(def, ctx))
			if (node2.isCyclic) node2 = withId(node2, ctx.id)
			nodesByRegisteredId[ctx.id] = node2
			return node2
		}
		finalize(node2) {
			bootstrapAliasReferences(node2)
			if (!node2.precompilation && !this.resolvedConfig.jitless)
				precompile(node2.references)
			return node2
		}
	}
	var SchemaScope = class extends BaseScope {
		parseOwnDefinitionFormat(def, ctx) {
			return parseNode(ctx)
		}
		preparseOwnDefinitionFormat(schema2, opts) {
			return this.preparseNode(schemaKindOf(schema2), schema2, opts)
		}
		preparseOwnAliasEntry(k, v) {
			return [k, v]
		}
		normalizeRootScopeValue(v) {
			return v
		}
	}
	var bootstrapAliasReferences = resolution => {
		resolution.references
			.filter(node2 => node2.hasKind("alias"))
			.forEach(aliasNode => {
				Object.assign(
					aliasNode.referencesById,
					aliasNode.resolution.referencesById
				)
				resolution.references.forEach(ref => {
					if (aliasNode.id in ref.referencesById)
						Object.assign(ref.referencesById, aliasNode.referencesById)
				})
			})
		return resolution
	}
	var resolutionsToJson = resolutions =>
		flatMorph(resolutions, (k, v) => [
			k,
			hasArkKind(v, "root") || hasArkKind(v, "generic") ? v.json
			: hasArkKind(v, "module") ? resolutionsToJson(v)
			: throwInternalError(`Unexpected resolution ${printable(v)}`)
		])
	var maybeResolveSubalias = (base, name) => {
		const dotIndex = name.indexOf(".")
		if (dotIndex === -1) return
		const dotPrefix = name.slice(0, dotIndex)
		const prefixSchema = base[dotPrefix]
		if (prefixSchema === void 0) return
		if (!hasArkKind(prefixSchema, "module"))
			return throwParseError(writeNonSubmoduleDotMessage(dotPrefix))
		const subalias = name.slice(dotIndex + 1)
		const resolution = prefixSchema[subalias]
		if (resolution === void 0)
			return maybeResolveSubalias(prefixSchema, subalias)
		if (hasArkKind(resolution, "root") || hasArkKind(resolution, "generic"))
			return resolution
		if (hasArkKind(resolution, "module")) {
			return (
				resolution.root ??
				throwParseError(writeMissingSubmoduleAccessMessage(name))
			)
		}
		throwInternalError(
			`Unexpected resolution for alias '${name}': ${printable(resolution)}`
		)
	}
	var schemaScope = (aliases, config) => new SchemaScope(aliases, config)
	var rootSchemaScope = new SchemaScope({})
	var resolutionsOfModule = ($, typeSet) => {
		const result = {}
		for (const k in typeSet) {
			const v = typeSet[k]
			if (hasArkKind(v, "module")) {
				const innerResolutions = resolutionsOfModule($, v)
				const prefixedResolutions = flatMorph(
					innerResolutions,
					(innerK, innerV) => [`${k}.${innerK}`, innerV]
				)
				Object.assign(result, prefixedResolutions)
			} else if (hasArkKind(v, "root") || hasArkKind(v, "generic"))
				result[k] = v
			else throwInternalError(`Unexpected scope resolution ${printable(v)}`)
		}
		return result
	}
	var writeUnresolvableMessage = token => `'${token}' is unresolvable`
	var writeNonSubmoduleDotMessage = name =>
		`'${name}' must reference a module to be accessed using dot syntax`
	var writeMissingSubmoduleAccessMessage = name =>
		`Reference to submodule '${name}' must specify an alias`
	rootSchemaScope.export()
	var rootSchema = rootSchemaScope.schema
	var node = rootSchemaScope.node
	var defineSchema = rootSchemaScope.defineSchema
	var genericNode = rootSchemaScope.generic

	// ../schema/out/structure/shared.js
	var arrayIndexSource = `^(?:0|[1-9]\\d*)$`
	var arrayIndexMatcher = new RegExp(arrayIndexSource)
	var arrayIndexMatcherReference = registeredReference(arrayIndexMatcher)

	// ../schema/out/intrinsic.js
	var intrinsicBases = schemaScope(
		{
			bigint: "bigint",
			// since we know this won't be reduced, it can be safely cast to a union
			boolean: [{ unit: false }, { unit: true }],
			false: { unit: false },
			never: [],
			null: { unit: null },
			number: "number",
			object: "object",
			string: "string",
			symbol: "symbol",
			true: { unit: true },
			unknown: {},
			undefined: { unit: void 0 },
			Array,
			Date
		},
		{ prereducedAliases: true }
	).export()
	$ark.intrinsic = { ...intrinsicBases }
	var intrinsicRoots = schemaScope(
		{
			integer: {
				domain: "number",
				divisor: 1
			},
			lengthBoundable: ["string", Array],
			key: ["string", "symbol"],
			nonNegativeIntegerString: { domain: "string", pattern: arrayIndexSource }
		},
		{ prereducedAliases: true }
	).export()
	Object.assign($ark.intrinsic, intrinsicRoots)
	var intrinsicJson = schemaScope(
		{
			jsonPrimitive: [
				"string",
				"number",
				{ unit: true },
				{ unit: false },
				{ unit: null }
			],
			jsonObject: {
				domain: "object",
				index: {
					signature: "string",
					value: "$jsonData"
				}
			},
			jsonData: ["$jsonPrimitive", "$jsonObject"]
		},
		{ prereducedAliases: true }
	).export()
	var intrinsic = {
		...intrinsicBases,
		...intrinsicRoots,
		...intrinsicJson,
		emptyStructure: node("structure", {}, { prereduced: true })
	}
	$ark.intrinsic = { ...intrinsic }

	// config.ts
	var configure = configureSchema

	// parser/shift/operand/date.ts
	var isDateLiteral = value2 =>
		typeof value2 === "string" &&
		value2[0] === "d" &&
		(value2[1] === "'" || value2[1] === '"') &&
		value2.at(-1) === value2[1]
	var isValidDate = d => d.toString() !== "Invalid Date"
	var extractDateLiteralSource = literal => literal.slice(2, -1)
	var writeInvalidDateMessage = source =>
		`'${source}' could not be parsed by the Date constructor`
	var tryParseDate = (source, errorOnFail) =>
		maybeParseDate(source, errorOnFail)
	var maybeParseDate = (source, errorOnFail) => {
		const stringParsedDate = new Date(source)
		if (isValidDate(stringParsedDate)) return stringParsedDate
		const epochMillis = tryParseNumber(source)
		if (epochMillis !== void 0) {
			const numberParsedDate = new Date(epochMillis)
			if (isValidDate(numberParsedDate)) return numberParsedDate
		}
		return errorOnFail ?
				throwParseError(
					errorOnFail === true ? writeInvalidDateMessage(source) : errorOnFail
				)
			:	void 0
	}

	// parser/shift/operand/enclosed.ts
	var parseEnclosed = (s, enclosing) => {
		const enclosed = s.scanner.shiftUntil(
			untilLookaheadIsClosing[enclosingTokens[enclosing]]
		)
		if (s.scanner.lookahead === "")
			return s.error(writeUnterminatedEnclosedMessage(enclosed, enclosing))
		s.scanner.shift()
		if (enclosing === "/") {
			try {
				new RegExp(enclosed)
			} catch (e) {
				throwParseError(String(e))
			}
			s.root = s.ctx.$.node(
				"intersection",
				{
					domain: "string",
					pattern: enclosed
				},
				{ prereduced: true }
			)
		} else if (isKeyOf(enclosing, enclosingQuote))
			s.root = s.ctx.$.node("unit", { unit: enclosed })
		else {
			const date = tryParseDate(enclosed, writeInvalidDateMessage(enclosed))
			s.root = s.ctx.$.node("unit", { meta: enclosed, unit: date })
		}
	}
	var enclosingQuote = {
		"'": 1,
		'"': 1
	}
	var enclosingChar = {
		"/": 1,
		"'": 1,
		'"': 1
	}
	var enclosingTokens = {
		"d'": "'",
		'd"': '"',
		"'": "'",
		'"': '"',
		"/": "/"
	}
	var untilLookaheadIsClosing = {
		"'": scanner => scanner.lookahead === `'`,
		'"': scanner => scanner.lookahead === `"`,
		"/": scanner => scanner.lookahead === `/`
	}
	var enclosingCharDescriptions = {
		'"': "double-quote",
		"'": "single-quote",
		"/": "forward slash"
	}
	var writeUnterminatedEnclosedMessage = (fragment, enclosingStart) =>
		`${enclosingStart}${fragment} requires a closing ${enclosingCharDescriptions[enclosingTokens[enclosingStart]]}`

	// parser/ast/validate.ts
	var writePrefixedPrivateReferenceMessage = name =>
		`Private type references should not include '#'. Use '${name}' instead.`
	var shallowOptionalMessage =
		"Optional definitions like 'string?' are only valid as properties in an object or tuple"
	var shallowDefaultableMessage =
		"Defaultable definitions like 'number = 0' are only valid as properties in an object or tuple"

	// parser/reduce/shared.ts
	var minComparators = {
		">": true,
		">=": true
	}
	var maxComparators = {
		"<": true,
		"<=": true
	}
	var invertedComparators = {
		"<": ">",
		">": "<",
		"<=": ">=",
		">=": "<=",
		"==": "=="
	}
	var writeUnmatchedGroupCloseMessage = unscanned =>
		`Unmatched )${unscanned === "" ? "" : ` before ${unscanned}`}`
	var writeUnclosedGroupMessage = missingChar => `Missing ${missingChar}`
	var writeOpenRangeMessage = (min, comparator) =>
		`Left bounds are only valid when paired with right bounds (try ...${comparator}${min})`
	var writeUnpairableComparatorMessage = comparator =>
		`Left-bounded expressions must specify their limits using < or <= (was ${comparator})`
	var writeMultipleLeftBoundsMessage = (
		openLimit,
		openComparator,
		limit,
		comparator
	) =>
		`An expression may have at most one left bound (parsed ${openLimit}${invertedComparators[openComparator]}, ${limit}${invertedComparators[comparator]})`

	// parser/shift/operand/genericArgs.ts
	var parseGenericArgs = (name, g, s) => _parseGenericArgs(name, g, s, [])
	var _parseGenericArgs = (name, g, s, argNodes) => {
		const argState = s.parseUntilFinalizer()
		argNodes.push(argState.root)
		if (argState.finalizer === ">") {
			if (argNodes.length !== g.params.length) {
				return s.error(
					writeInvalidGenericArgCountMessage(
						name,
						g.names,
						argNodes.map(arg => arg.expression)
					)
				)
			}
			return argNodes
		}
		if (argState.finalizer === ",")
			return _parseGenericArgs(name, g, s, argNodes)
		return argState.error(writeUnclosedGroupMessage(">"))
	}
	var writeInvalidGenericArgCountMessage = (name, params, argDefs) =>
		`${name}<${params.join(", ")}> requires exactly ${params.length} args (got ${argDefs.length}${argDefs.length === 0 ? "" : `: ${argDefs.join(", ")}`})`

	// parser/shift/operand/unenclosed.ts
	var parseUnenclosed = s => {
		const token = s.scanner.shiftUntilNextTerminator()
		if (token === "keyof") s.addPrefix("keyof")
		else s.root = unenclosedToNode(s, token)
	}
	var parseGenericInstantiation = (name, g, s) => {
		s.scanner.shiftUntilNonWhitespace()
		const lookahead = s.scanner.shift()
		if (lookahead !== "<")
			return s.error(writeInvalidGenericArgCountMessage(name, g.names, []))
		const parsedArgs = parseGenericArgs(name, g, s)
		return g(...parsedArgs)
	}
	var unenclosedToNode = (s, token) =>
		maybeParseReference(s, token) ??
		maybeParseUnenclosedLiteral(s, token) ??
		s.error(
			token === "" ?
				s.scanner.lookahead === "#" ?
					writePrefixedPrivateReferenceMessage(
						s.shiftedByOne().scanner.shiftUntilNextTerminator()
					)
				:	writeMissingOperandMessage(s)
			:	writeUnresolvableMessage(token)
		)
	var maybeParseReference = (s, token) => {
		if (s.ctx.args?.[token]) {
			const arg = s.ctx.args[token]
			if (typeof arg !== "string") return arg
			return s.ctx.$.node("alias", { reference: arg }, { prereduced: true })
		}
		const resolution = s.ctx.$.maybeResolve(token)
		if (hasArkKind(resolution, "root")) return resolution
		if (resolution === void 0) return
		if (hasArkKind(resolution, "generic"))
			return parseGenericInstantiation(token, resolution, s)
		return throwParseError(`Unexpected resolution ${printable(resolution)}`)
	}
	var maybeParseUnenclosedLiteral = (s, token) => {
		const maybeNumber = tryParseWellFormedNumber(token)
		if (maybeNumber !== void 0)
			return s.ctx.$.node("unit", { unit: maybeNumber })
		const maybeBigint = tryParseWellFormedBigint(token)
		if (maybeBigint !== void 0)
			return s.ctx.$.node("unit", { unit: maybeBigint })
	}
	var writeMissingOperandMessage = s => {
		const operator = s.previousOperator()
		return operator ?
				writeMissingRightOperandMessage(operator, s.scanner.unscanned)
			:	writeExpressionExpectedMessage(s.scanner.unscanned)
	}
	var writeMissingRightOperandMessage = (token, unscanned = "") =>
		`Token '${token}' requires a right operand${unscanned ? ` before '${unscanned}'` : ""}`
	var writeExpressionExpectedMessage = unscanned =>
		`Expected an expression${unscanned ? ` before '${unscanned}'` : ""}`

	// parser/shift/operand/operand.ts
	var parseOperand = s =>
		s.scanner.lookahead === "" ? s.error(writeMissingOperandMessage(s))
		: s.scanner.lookahead === "(" ? s.shiftedByOne().reduceGroupOpen()
		: s.scanner.lookaheadIsIn(enclosingChar) ?
			parseEnclosed(s, s.scanner.shift())
		: s.scanner.lookaheadIsIn(whitespaceChars) ? parseOperand(s.shiftedByOne())
		: s.scanner.lookahead === "d" ?
			s.scanner.nextLookahead in enclosingQuote ?
				parseEnclosed(s, `${s.scanner.shift()}${s.scanner.shift()}`)
			:	parseUnenclosed(s)
		:	parseUnenclosed(s)

	// parser/shift/scanner.ts
	var ArkTypeScanner = class _ArkTypeScanner extends Scanner {
		shiftUntilNextTerminator() {
			this.shiftUntilNonWhitespace()
			return this.shiftUntil(
				() => this.lookahead in _ArkTypeScanner.terminatingChars
			)
		}
		static terminatingChars = {
			"<": 1,
			">": 1,
			"=": 1,
			"|": 1,
			"&": 1,
			")": 1,
			"[": 1,
			"%": 1,
			",": 1,
			":": 1,
			"?": 1,
			"#": 1,
			...whitespaceChars
		}
		static finalizingLookaheads = {
			">": 1,
			",": 1,
			"": 1,
			"=": 1,
			"?": 1
		}
		static lookaheadIsFinalizing = (lookahead, unscanned) =>
			lookahead === ">" ?
				unscanned[0] === "=" ?
					// >== would only occur in an expression like Array<number>==5
					// otherwise, >= would only occur as part of a bound like number>=5
					unscanned[1] === "="
				:	unscanned.trimStart() === "" ||
					isKeyOf(unscanned.trimStart()[0], _ArkTypeScanner.terminatingChars)
			: lookahead === "=" ? unscanned[0] !== "="
			: lookahead === "," || lookahead === "?"
	}

	// parser/shift/operator/bounds.ts
	var parseBound = (s, start) => {
		const comparator = shiftComparator(s, start)
		if (s.root.hasKind("unit")) {
			if (typeof s.root.unit === "number") {
				s.reduceLeftBound(s.root.unit, comparator)
				s.unsetRoot()
				return
			}
			if (s.root.unit instanceof Date) {
				const literal = `d'${s.root.description ?? s.root.unit.toISOString()}'`
				s.unsetRoot()
				s.reduceLeftBound(literal, comparator)
				return
			}
		}
		return parseRightBound(s, comparator)
	}
	var comparatorStartChars = {
		"<": 1,
		">": 1,
		"=": 1
	}
	var shiftComparator = (s, start) =>
		s.scanner.lookaheadIs("=") ? `${start}${s.scanner.shift()}` : start
	var getBoundKinds = (comparator, limit, root, boundKind) => {
		if (root.extends($ark.intrinsic.number)) {
			if (typeof limit !== "number") {
				return throwParseError(
					writeInvalidLimitMessage(comparator, limit, boundKind)
				)
			}
			return (
				comparator === "==" ? ["min", "max"]
				: comparator[0] === ">" ? ["min"]
				: ["max"]
			)
		}
		if (root.extends($ark.intrinsic.lengthBoundable)) {
			if (typeof limit !== "number") {
				return throwParseError(
					writeInvalidLimitMessage(comparator, limit, boundKind)
				)
			}
			return (
				comparator === "==" ? ["exactLength"]
				: comparator[0] === ">" ? ["minLength"]
				: ["maxLength"]
			)
		}
		if (root.extends($ark.intrinsic.Date)) {
			return (
				comparator === "==" ? ["after", "before"]
				: comparator[0] === ">" ? ["after"]
				: ["before"]
			)
		}
		return throwParseError(writeUnboundableMessage(root.expression))
	}
	var openLeftBoundToRoot = leftBound => ({
		rule:
			isDateLiteral(leftBound.limit) ?
				extractDateLiteralSource(leftBound.limit)
			:	leftBound.limit,
		exclusive: leftBound.comparator.length === 1
	})
	var parseRightBound = (s, comparator) => {
		const previousRoot = s.unsetRoot()
		const previousScannerIndex = s.scanner.location
		s.parseOperand()
		const limitNode = s.unsetRoot()
		const limitToken = s.scanner.sliceChars(
			previousScannerIndex,
			s.scanner.location
		)
		s.root = previousRoot
		if (
			!limitNode.hasKind("unit") ||
			(typeof limitNode.unit !== "number" && !(limitNode.unit instanceof Date))
		)
			return s.error(writeInvalidLimitMessage(comparator, limitToken, "right"))
		const limit = limitNode.unit
		const exclusive = comparator.length === 1
		const boundKinds = getBoundKinds(
			comparator,
			typeof limit === "number" ? limit : limitToken,
			previousRoot,
			"right"
		)
		for (const kind of boundKinds) {
			s.constrainRoot(
				kind,
				comparator === "==" ? { rule: limit } : { rule: limit, exclusive }
			)
		}
		if (!s.branches.leftBound) return
		if (!isKeyOf(comparator, maxComparators))
			return s.error(writeUnpairableComparatorMessage(comparator))
		const lowerBoundKind = getBoundKinds(
			s.branches.leftBound.comparator,
			s.branches.leftBound.limit,
			previousRoot,
			"left"
		)
		s.constrainRoot(
			lowerBoundKind[0],
			openLeftBoundToRoot(s.branches.leftBound)
		)
		s.branches.leftBound = null
	}
	var writeInvalidLimitMessage = (comparator, limit, boundKind) =>
		`Comparator ${boundKind === "left" ? invertedComparators[comparator] : comparator} must be ${boundKind === "left" ? "preceded" : "followed"} by a corresponding literal (was ${limit})`

	// parser/shift/operator/brand.ts
	var parseBrand = s => {
		s.scanner.shiftUntilNonWhitespace()
		const brandName = s.scanner.shiftUntilNextTerminator()
		s.root = s.root.brand(brandName)
	}

	// parser/shift/operator/divisor.ts
	var parseDivisor = s => {
		const divisorToken = s.scanner.shiftUntilNextTerminator()
		const divisor = tryParseInteger(divisorToken, {
			errorOnFail: writeInvalidDivisorMessage(divisorToken)
		})
		if (divisor === 0) s.error(writeInvalidDivisorMessage(0))
		s.root = s.root.constrain("divisor", divisor)
	}
	var writeInvalidDivisorMessage = divisor =>
		`% operator must be followed by a non-zero integer literal (was ${divisor})`

	// parser/shift/operator/operator.ts
	var parseOperator = s => {
		const lookahead = s.scanner.shift()
		return (
			lookahead === "" ? s.finalize("")
			: lookahead === "[" ?
				s.scanner.shift() === "]" ?
					s.setRoot(s.root.array())
				:	s.error(incompleteArrayTokenMessage)
			: lookahead === "|" ?
				s.scanner.lookahead === ">" ?
					s.shiftedByOne().pushRootToBranch("|>")
				:	s.pushRootToBranch(lookahead)
			: lookahead === "&" ? s.pushRootToBranch(lookahead)
			: lookahead === ")" ? s.finalizeGroup()
			: ArkTypeScanner.lookaheadIsFinalizing(lookahead, s.scanner.unscanned) ?
				s.finalize(lookahead)
			: isKeyOf(lookahead, comparatorStartChars) ? parseBound(s, lookahead)
			: lookahead === "%" ? parseDivisor(s)
			: lookahead === "#" ? parseBrand(s)
			: lookahead in whitespaceChars ? parseOperator(s)
			: s.error(writeUnexpectedCharacterMessage(lookahead))
		)
	}
	var writeUnexpectedCharacterMessage = (char, shouldBe = "") =>
		`'${char}' is not allowed here${shouldBe && ` (should be ${shouldBe})`}`
	var incompleteArrayTokenMessage = `Missing expected ']'`

	// parser/shift/operator/default.ts
	var parseDefault = s => {
		const baseNode = s.unsetRoot()
		s.parseOperand()
		const defaultNode = s.unsetRoot()
		if (!defaultNode.hasKind("unit"))
			return s.error(writeNonLiteralDefaultMessage(defaultNode.expression))
		const defaultValue =
			defaultNode.unit instanceof Date ?
				() => new Date(defaultNode.unit)
			:	defaultNode.unit
		return [baseNode, "=", defaultValue]
	}
	var writeNonLiteralDefaultMessage = defaultDef =>
		`Default value '${defaultDef}' must a literal value`

	// parser/string.ts
	var parseString = (def, ctx) => {
		const aliasResolution = ctx.$.maybeResolveRoot(def)
		if (aliasResolution) return aliasResolution
		if (def.endsWith("[]")) {
			const possibleElementResolution = ctx.$.maybeResolveRoot(def.slice(0, -2))
			if (possibleElementResolution) return possibleElementResolution.array()
		}
		const s = new DynamicState(new ArkTypeScanner(def), ctx)
		const node2 = fullStringParse(s)
		if (s.finalizer === ">")
			throwParseError(writeUnexpectedCharacterMessage(">"))
		return node2
	}
	var fullStringParse = s => {
		s.parseOperand()
		let result = parseUntilFinalizer(s).root
		if (!result) {
			return throwInternalError(
				`Root was unexpectedly unset after parsing string '${s.scanner.scanned}'`
			)
		}
		if (s.finalizer === "=") result = parseDefault(s)
		else if (s.finalizer === "?") result = [result, "?"]
		s.scanner.shiftUntilNonWhitespace()
		if (s.scanner.lookahead) {
			throwParseError(writeUnexpectedCharacterMessage(s.scanner.lookahead))
		}
		return result
	}
	var parseUntilFinalizer = s => {
		while (s.finalizer === void 0) next(s)
		return s
	}
	var next = s => (s.hasRoot() ? s.parseOperator() : s.parseOperand())

	// parser/reduce/dynamic.ts
	var DynamicState = class _DynamicState {
		// set root type to `any` so that all constraints can be applied
		root
		branches = {
			prefixes: [],
			leftBound: null,
			intersection: null,
			union: null,
			pipe: null
		}
		finalizer
		groups = []
		scanner
		ctx
		constructor(scanner, ctx) {
			this.scanner = scanner
			this.ctx = ctx
		}
		error(message) {
			return throwParseError(message)
		}
		hasRoot() {
			return this.root !== void 0
		}
		setRoot(root) {
			this.root = root
		}
		unsetRoot() {
			const value2 = this.root
			this.root = void 0
			return value2
		}
		constrainRoot(...args2) {
			this.root = this.root.constrain(args2[0], args2[1])
		}
		finalize(finalizer) {
			if (this.groups.length) return this.error(writeUnclosedGroupMessage(")"))
			this.finalizeBranches()
			this.finalizer = finalizer
		}
		reduceLeftBound(limit, comparator) {
			const invertedComparator = invertedComparators[comparator]
			if (!isKeyOf(invertedComparator, minComparators))
				return this.error(writeUnpairableComparatorMessage(comparator))
			if (this.branches.leftBound) {
				return this.error(
					writeMultipleLeftBoundsMessage(
						this.branches.leftBound.limit,
						this.branches.leftBound.comparator,
						limit,
						invertedComparator
					)
				)
			}
			this.branches.leftBound = {
				comparator: invertedComparator,
				limit
			}
		}
		finalizeBranches() {
			this.assertRangeUnset()
			if (this.branches.pipe) {
				this.pushRootToBranch("|>")
				this.root = this.branches.pipe
				return
			}
			if (this.branches.union) {
				this.pushRootToBranch("|")
				this.root = this.branches.union
				return
			}
			if (this.branches.intersection) {
				this.pushRootToBranch("&")
				this.root = this.branches.intersection
				return
			}
			this.applyPrefixes()
		}
		finalizeGroup() {
			this.finalizeBranches()
			const topBranchState = this.groups.pop()
			if (!topBranchState)
				return this.error(
					writeUnmatchedGroupCloseMessage(this.scanner.unscanned)
				)
			this.branches = topBranchState
		}
		addPrefix(prefix) {
			this.branches.prefixes.push(prefix)
		}
		applyPrefixes() {
			while (this.branches.prefixes.length) {
				const lastPrefix = this.branches.prefixes.pop()
				this.root =
					lastPrefix === "keyof" ?
						this.root.keyof()
					:	throwInternalError(`Unexpected prefix '${lastPrefix}'`)
			}
		}
		pushRootToBranch(token) {
			this.assertRangeUnset()
			this.applyPrefixes()
			const root = this.root
			this.root = void 0
			this.branches.intersection =
				this.branches.intersection?.rawAnd(root) ?? root
			if (token === "&") return
			this.branches.union =
				this.branches.union?.rawOr(this.branches.intersection) ??
				this.branches.intersection
			this.branches.intersection = null
			if (token === "|") return
			this.branches.pipe =
				this.branches.pipe?.rawPipeOnce(this.branches.union) ??
				this.branches.union
			this.branches.union = null
		}
		parseUntilFinalizer() {
			return parseUntilFinalizer(new _DynamicState(this.scanner, this.ctx))
		}
		parseOperator() {
			return parseOperator(this)
		}
		parseOperand() {
			return parseOperand(this)
		}
		assertRangeUnset() {
			if (this.branches.leftBound) {
				return this.error(
					writeOpenRangeMessage(
						this.branches.leftBound.limit,
						this.branches.leftBound.comparator
					)
				)
			}
		}
		reduceGroupOpen() {
			this.groups.push(this.branches)
			this.branches = {
				prefixes: [],
				leftBound: null,
				union: null,
				intersection: null,
				pipe: null
			}
		}
		previousOperator() {
			return (
				this.branches.leftBound?.comparator ??
				this.branches.prefixes.at(-1) ??
				(this.branches.intersection ? "&"
				: this.branches.union ? "|"
				: this.branches.pipe ? "|>"
				: void 0)
			)
		}
		shiftedByOne() {
			this.scanner.shift()
			return this
		}
	}

	// generic.ts
	var Generic = GenericRoot
	var emptyGenericParameterMessage =
		"An empty string is not a valid generic parameter name"
	var parseGenericParamName = (scanner, result, ctx) => {
		scanner.shiftUntilNonWhitespace()
		const name = scanner.shiftUntilNextTerminator()
		if (name === "") {
			if (scanner.lookahead === "" && result.length) return result
			return throwParseError(emptyGenericParameterMessage)
		}
		scanner.shiftUntilNonWhitespace()
		return _parseOptionalConstraint(scanner, name, result, ctx)
	}
	var extendsToken = "extends "
	var _parseOptionalConstraint = (scanner, name, result, ctx) => {
		scanner.shiftUntilNonWhitespace()
		if (scanner.unscanned.startsWith(extendsToken))
			scanner.jumpForward(extendsToken.length)
		else {
			if (scanner.lookahead === ",") scanner.shift()
			result.push(name)
			return parseGenericParamName(scanner, result, ctx)
		}
		const s = parseUntilFinalizer(new DynamicState(scanner, ctx))
		result.push([name, s.root])
		return parseGenericParamName(scanner, result, ctx)
	}

	// match.ts
	var InternalMatchParser = class extends Callable {
		$
		constructor($) {
			super((...args2) => new InternalChainedMatchParser($)(...args2), {
				bind: $
			})
			this.$ = $
		}
		in(def) {
			return new InternalChainedMatchParser(
				this.$,
				def === void 0 ? void 0 : this.$.parse(def)
			)
		}
		at(key, cases) {
			return new InternalChainedMatchParser(this.$).at(key, cases)
		}
		case(when, then) {
			return new InternalChainedMatchParser(this.$).case(when, then)
		}
	}
	var InternalChainedMatchParser = class extends Callable {
		$;
		in
		key
		branches = []
		constructor($, In) {
			super(cases =>
				this.caseEntries(
					Object.entries(cases).map(([k, v]) =>
						k === "default" ? [k, v] : [this.$.parse(k), v]
					)
				)
			)
			this.$ = $
			this.in = In
		}
		at(key, cases) {
			if (this.key) throwParseError(doubleAtMessage)
			if (this.branches.length) throwParseError(chainedAtMessage)
			this.key = key
			return cases ? this.match(cases) : this
		}
		case(def, resolver) {
			return this.caseEntry(this.$.parse(def), resolver)
		}
		caseEntry(node2, resolver) {
			const wrappableNode =
				this.key ? this.$.parse({ [this.key]: node2 }) : node2
			const branch = wrappableNode.pipe(resolver)
			this.branches.push(branch)
			return this
		}
		match(cases) {
			return this(cases)
		}
		strings(cases) {
			return this.caseEntries(
				Object.entries(cases).map(([k, v]) =>
					k === "default" ? [k, v] : [this.$.node("unit", { unit: k }), v]
				)
			)
		}
		caseEntries(entries) {
			for (let i = 0; i < entries.length; i++) {
				const [k, v] = entries[i]
				if (k === "default") {
					if (i !== entries.length - 1) {
						throwParseError(
							`default may only be specified as the last key of a switch definition`
						)
					}
					return this.default(v)
				}
				if (typeof v !== "function") {
					return throwParseError(
						`Value for case "${k}" must be a function (was ${domainOf(v)})`
					)
				}
				this.caseEntry(k, v)
			}
			return this
		}
		default(defaultCase) {
			if (typeof defaultCase === "function")
				this.case(intrinsic.unknown, defaultCase)
			const schema2 = {
				branches: this.branches,
				ordered: true
			}
			if (defaultCase === "never" || defaultCase === "assert")
				schema2.meta = { onFail: throwOnDefault }
			const cases = this.$.node("union", schema2)
			if (!this.in) return this.$.finalize(cases)
			let inputValidatedCases = this.in.pipe(cases)
			if (defaultCase === "never" || defaultCase === "assert") {
				inputValidatedCases = inputValidatedCases.configureReferences(
					{
						onFail: throwOnDefault
					},
					"self"
				)
			}
			return this.$.finalize(inputValidatedCases)
		}
	}
	var throwOnDefault = errors => errors.throw()
	var chainedAtMessage = `A key matcher must be specified before the first case i.e. match.at('foo') or match.in<object>().at('bar')`
	var doubleAtMessage = `At most one key matcher may be specified per expression`

	// parser/property.ts
	var parseProperty = (def, ctx) => {
		if (isArray(def)) {
			if (def[1] === "=")
				return [ctx.$.parseOwnDefinitionFormat(def[0], ctx), "=", def[2]]
			if (def[1] === "?")
				return [ctx.$.parseOwnDefinitionFormat(def[0], ctx), "?"]
		}
		return parseInnerDefinition(def, ctx)
	}
	var invalidOptionalKeyKindMessage = `Only required keys may make their values optional, e.g. { [mySymbol]: ['number', '?'] }`
	var invalidDefaultableKeyKindMessage = `Only required keys may specify default values, e.g. { value: 'number = 0' }`

	// parser/objectLiteral.ts
	var parseObjectLiteral = (def, ctx) => {
		let spread
		const structure = {}
		const defEntries = stringAndSymbolicEntriesOf(def)
		for (const [k, v] of defEntries) {
			const parsedKey = preparseKey(k)
			if (parsedKey.kind === "spread") {
				if (!isEmptyObject(structure))
					return throwParseError(nonLeadingSpreadError)
				const operand = ctx.$.parseOwnDefinitionFormat(v, ctx)
				if (operand.equals(intrinsic.object)) continue
				if (
					!operand.hasKind("intersection") || // still error on attempts to spread proto nodes like ...Date
					!operand.basis?.equals(intrinsic.object)
				) {
					return throwParseError(
						writeInvalidSpreadTypeMessage(operand.expression)
					)
				}
				spread = operand.structure
				continue
			}
			if (parsedKey.kind === "undeclared") {
				if (v !== "reject" && v !== "delete" && v !== "ignore")
					throwParseError(writeInvalidUndeclaredBehaviorMessage(v))
				structure.undeclared = v
				continue
			}
			const parsedValue = parseProperty(v, ctx)
			const parsedEntryKey = parsedKey
			if (parsedKey.kind === "required") {
				if (!isArray(parsedValue)) {
					appendNamedProp(
						structure,
						"required",
						{
							key: parsedKey.normalized,
							value: parsedValue
						},
						ctx
					)
				} else {
					appendNamedProp(
						structure,
						"optional",
						parsedValue[1] === "=" ?
							{
								key: parsedKey.normalized,
								value: parsedValue[0],
								default: parsedValue[2]
							}
						:	{
								key: parsedKey.normalized,
								value: parsedValue[0]
							},
						ctx
					)
				}
				continue
			}
			if (isArray(parsedValue)) {
				if (parsedValue[1] === "?")
					throwParseError(invalidOptionalKeyKindMessage)
				if (parsedValue[1] === "=")
					throwParseError(invalidDefaultableKeyKindMessage)
			}
			if (parsedKey.kind === "optional") {
				appendNamedProp(
					structure,
					"optional",
					{
						key: parsedKey.normalized,
						value: parsedValue
					},
					ctx
				)
				continue
			}
			const signature = ctx.$.parseOwnDefinitionFormat(
				parsedEntryKey.normalized,
				ctx
			)
			const normalized = normalizeIndex(signature, parsedValue, ctx.$)
			if (normalized.index)
				structure.index = append(structure.index, normalized.index)
			if (normalized.required)
				structure.required = append(structure.required, normalized.required)
		}
		const structureNode = ctx.$.node("structure", structure)
		return ctx.$.parseSchema({
			domain: "object",
			structure: spread?.merge(structureNode) ?? structureNode
		})
	}
	var appendNamedProp = (structure, kind, inner, ctx) => {
		structure[kind] = append(
			// doesn't seem like this cast should be necessary
			structure[kind],
			ctx.$.node(kind, inner)
		)
	}
	var writeInvalidUndeclaredBehaviorMessage = actual =>
		`Value of '+' key must be 'reject', 'delete', or 'ignore' (was ${printable(actual)})`
	var nonLeadingSpreadError =
		"Spread operator may only be used as the first key in an object"
	var preparseKey = key =>
		typeof key === "symbol" ? { kind: "required", normalized: key }
		: key.at(-1) === "?" ?
			key.at(-2) === escapeChar ?
				{ kind: "required", normalized: `${key.slice(0, -2)}?` }
			:	{
					kind: "optional",
					normalized: key.slice(0, -1)
				}
		: key[0] === "[" && key.at(-1) === "]" ?
			{ kind: "index", normalized: key.slice(1, -1) }
		: key[0] === escapeChar && key[1] === "[" && key.at(-1) === "]" ?
			{ kind: "required", normalized: key.slice(1) }
		: key === "..." ? { kind: "spread" }
		: key === "+" ? { kind: "undeclared" }
		: {
				kind: "required",
				normalized:
					key === "\\..." ? "..."
					: key === "\\+" ? "+"
					: key
			}
	var writeInvalidSpreadTypeMessage = def =>
		`Spread operand must resolve to an object literal type (was ${def})`

	// parser/tupleExpressions.ts
	var maybeParseTupleExpression = (def, ctx) =>
		isIndexZeroExpression(def) ? indexZeroParsers[def[0]](def, ctx)
		: isIndexOneExpression(def) ? indexOneParsers[def[1]](def, ctx)
		: null
	var parseKeyOfTuple = (def, ctx) =>
		ctx.$.parseOwnDefinitionFormat(def[1], ctx).keyof()
	var parseBranchTuple = (def, ctx) => {
		if (def[2] === void 0)
			return throwParseError(writeMissingRightOperandMessage(def[1], ""))
		const l = ctx.$.parseOwnDefinitionFormat(def[0], ctx)
		const r = ctx.$.parseOwnDefinitionFormat(def[2], ctx)
		if (def[1] === "|") return ctx.$.node("union", { branches: [l, r] })
		const result =
			def[1] === "&" ?
				intersectNodesRoot(l, r, ctx.$)
			:	pipeNodesRoot(l, r, ctx.$)
		if (result instanceof Disjoint) return result.throw()
		return result
	}
	var parseArrayTuple = (def, ctx) =>
		ctx.$.parseOwnDefinitionFormat(def[0], ctx).array()
	var parseMorphTuple = (def, ctx) => {
		if (typeof def[2] !== "function") {
			return throwParseError(
				writeMalformedFunctionalExpressionMessage("=>", def[2])
			)
		}
		return ctx.$.parseOwnDefinitionFormat(def[0], ctx).pipe(def[2])
	}
	var writeMalformedFunctionalExpressionMessage = (operator, value2) =>
		`${operator === ":" ? "Narrow" : "Morph"} expression requires a function following '${operator}' (was ${typeof value2})`
	var parseNarrowTuple = (def, ctx) => {
		if (typeof def[2] !== "function") {
			return throwParseError(
				writeMalformedFunctionalExpressionMessage(":", def[2])
			)
		}
		return ctx.$.parseOwnDefinitionFormat(def[0], ctx).constrain(
			"predicate",
			def[2]
		)
	}
	var parseAttributeTuple = (def, ctx) =>
		ctx.$.parseOwnDefinitionFormat(def[0], ctx).configureReferences(
			def[2],
			"shallow"
		)
	var defineIndexOneParsers = parsers => parsers
	var postfixParsers = defineIndexOneParsers({
		"[]": parseArrayTuple,
		"?": () => throwParseError(shallowOptionalMessage)
	})
	var infixParsers = defineIndexOneParsers({
		"|": parseBranchTuple,
		"&": parseBranchTuple,
		":": parseNarrowTuple,
		"=>": parseMorphTuple,
		"|>": parseBranchTuple,
		"@": parseAttributeTuple,
		// since object and tuple literals parse there via `parseProperty`,
		// they must be shallow if parsed directly as a tuple expression
		"=": () => throwParseError(shallowDefaultableMessage)
	})
	var indexOneParsers = { ...postfixParsers, ...infixParsers }
	var isIndexOneExpression = def => indexOneParsers[def[1]] !== void 0
	var defineIndexZeroParsers = parsers => parsers
	var indexZeroParsers = defineIndexZeroParsers({
		keyof: parseKeyOfTuple,
		instanceof: (def, ctx) => {
			if (typeof def[1] !== "function") {
				return throwParseError(
					writeInvalidConstructorMessage(objectKindOrDomainOf(def[1]))
				)
			}
			const branches = def
				.slice(1)
				.map(ctor =>
					typeof ctor === "function" ?
						ctx.$.node("proto", { proto: ctor })
					:	throwParseError(
							writeInvalidConstructorMessage(objectKindOrDomainOf(ctor))
						)
				)
			return branches.length === 1 ?
					branches[0]
				:	ctx.$.node("union", { branches })
		},
		"===": (def, ctx) => ctx.$.units(def.slice(1))
	})
	var isIndexZeroExpression = def => indexZeroParsers[def[0]] !== void 0
	var writeInvalidConstructorMessage = actual =>
		`Expected a constructor following 'instanceof' operator (was ${actual})`

	// parser/tupleLiteral.ts
	var parseTupleLiteral = (def, ctx) => {
		let sequences = [{}]
		let i = 0
		while (i < def.length) {
			let spread = false
			if (def[i] === "..." && i < def.length - 1) {
				spread = true
				i++
			}
			const parsedProperty = parseProperty(def[i], ctx)
			const [valueNode, operator, possibleDefaultValue] =
				!isArray(parsedProperty) ? [parsedProperty] : parsedProperty
			i++
			if (spread) {
				if (!valueNode.extends($ark.intrinsic.Array))
					return throwParseError(
						writeNonArraySpreadMessage(valueNode.expression)
					)
				sequences = sequences.flatMap(base =>
					// since appendElement mutates base, we have to shallow-ish clone it for each branch
					valueNode.distribute(branch =>
						appendSpreadBranch(makeRootAndArrayPropertiesMutable(base), branch)
					)
				)
			} else {
				sequences = sequences.map(base => {
					if (operator === "?") return appendOptionalElement(base, valueNode)
					if (operator === "=")
						return appendDefaultableElement(
							base,
							valueNode,
							possibleDefaultValue
						)
					return appendRequiredElement(base, valueNode)
				})
			}
		}
		return ctx.$.parseSchema(
			sequences.map(sequence =>
				isEmptyObject(sequence) ?
					{
						proto: Array,
						exactLength: 0
					}
				:	{
						proto: Array,
						sequence
					}
			)
		)
	}
	var appendRequiredElement = (base, element) => {
		if (base.defaultables || base.optionals) {
			return throwParseError(
				base.variadic ?
					// e.g. [boolean = true, ...string[], number]
					postfixAfterOptionalOrDefaultableMessage
				:	requiredPostOptionalMessage
			)
		}
		if (base.variadic) {
			base.postfix = append(base.postfix, element)
		} else {
			base.prefix = append(base.prefix, element)
		}
		return base
	}
	var appendOptionalElement = (base, element) => {
		if (base.variadic)
			return throwParseError(optionalOrDefaultableAfterVariadicMessage)
		base.optionals = append(base.optionals, element)
		return base
	}
	var appendDefaultableElement = (base, element, value2) => {
		if (base.variadic)
			return throwParseError(optionalOrDefaultableAfterVariadicMessage)
		if (base.optionals) return throwParseError(defaultablePostOptionalMessage)
		base.defaultables = append(base.defaultables, [[element, value2]])
		return base
	}
	var appendVariadicElement = (base, element) => {
		if (base.postfix) throwParseError(multipleVariadicMesage)
		if (base.variadic) {
			if (!base.variadic.equals(element)) {
				throwParseError(multipleVariadicMesage)
			}
		} else {
			base.variadic = element.internal
		}
		return base
	}
	var appendSpreadBranch = (base, branch) => {
		const spread = branch.select({ method: "find", kind: "sequence" })
		if (!spread) {
			return appendVariadicElement(base, $ark.intrinsic.unknown)
		}
		spread.prefix?.forEach(node2 => appendRequiredElement(base, node2))
		spread.optionals?.forEach(node2 => appendOptionalElement(base, node2))
		if (spread.variadic) appendVariadicElement(base, spread.variadic)
		spread.postfix?.forEach(node2 => appendRequiredElement(base, node2))
		return base
	}
	var writeNonArraySpreadMessage = operand =>
		`Spread element must be an array (was ${operand})`
	var multipleVariadicMesage = "A tuple may have at most one variadic element"
	var requiredPostOptionalMessage =
		"A required element may not follow an optional element"
	var optionalOrDefaultableAfterVariadicMessage =
		"An optional element may not follow a variadic element"
	var defaultablePostOptionalMessage =
		"A defaultable element may not follow an optional element without a default"

	// parser/definition.ts
	var parseCache = {}
	var parseInnerDefinition = (def, ctx) => {
		if (typeof def === "string") {
			if (ctx.args && Object.keys(ctx.args).some(k => def.includes(k))) {
				return parseString(def, ctx)
			}
			const scopeCache = (parseCache[ctx.$.name] ??= {})
			return (scopeCache[def] ??= parseString(def, ctx))
		}
		return hasDomain(def, "object") ?
				parseObject(def, ctx)
			:	throwParseError(writeBadDefinitionTypeMessage(domainOf(def)))
	}
	var parseObject = (def, ctx) => {
		const objectKind = objectKindOf(def)
		switch (objectKind) {
			case void 0:
				if (hasArkKind(def, "root")) return def
				return parseObjectLiteral(def, ctx)
			case "Array":
				return parseTuple(def, ctx)
			case "RegExp":
				return ctx.$.node(
					"intersection",
					{
						domain: "string",
						pattern: def
					},
					{ prereduced: true }
				)
			case "Function": {
				const resolvedDef = isThunk(def) ? def() : def
				if (hasArkKind(resolvedDef, "root")) return resolvedDef
				return throwParseError(writeBadDefinitionTypeMessage("Function"))
			}
			default:
				return throwParseError(
					writeBadDefinitionTypeMessage(objectKind ?? printable(def))
				)
		}
	}
	var parseTuple = (def, ctx) =>
		maybeParseTupleExpression(def, ctx) ?? parseTupleLiteral(def, ctx)
	var writeBadDefinitionTypeMessage = actual =>
		`Type definitions must be strings or objects (was ${actual})`

	// type.ts
	var InternalTypeParser = class extends Callable {
		constructor($) {
			const attach = Object.assign(
				{
					errors: ArkErrors,
					hkt: Hkt,
					$,
					raw: $.parse,
					module: $.constructor.module,
					scope: $.constructor.scope,
					define: $.define,
					match: $.match,
					generic: $.generic,
					schema: $.schema,
					// this won't be defined during bootstrapping, but externally always will be
					keywords: $.ambient,
					unit: $.unit,
					enumerated: $.enumerated,
					instanceOf: $.instanceOf,
					valueOf: $.valueOf,
					or: $.or,
					and: $.and,
					merge: $.merge,
					pipe: $.pipe
				},
				// also won't be defined during bootstrapping
				$.ambientAttachments
			)
			super(
				(...args2) => {
					if (args2.length === 1) {
						return $.parse(args2[0])
					}
					if (
						args2.length === 2 &&
						typeof args2[0] === "string" &&
						args2[0][0] === "<" &&
						args2[0].at(-1) === ">"
					) {
						const paramString = args2[0].slice(1, -1)
						const params = $.parseGenericParams(paramString, {})
						return new GenericRoot(params, args2[1], $, $, null)
					}
					return $.parse(args2)
				},
				{
					bind: $,
					attach
				}
			)
		}
	}
	var Type = BaseRoot

	// scope.ts
	var $arkTypeRegistry = $ark
	var InternalScope = class _InternalScope extends BaseScope {
		get ambientAttachments() {
			if (!$arkTypeRegistry.typeAttachments) return
			return this.cacheGetter(
				"ambientAttachments",
				flatMorph($arkTypeRegistry.typeAttachments, (k, v) => [
					k,
					this.bindReference(v)
				])
			)
		}
		preparseOwnAliasEntry(alias, def) {
			const firstParamIndex = alias.indexOf("<")
			if (firstParamIndex === -1) {
				if (hasArkKind(def, "module") || hasArkKind(def, "generic"))
					return [alias, def]
				const qualifiedName =
					this.name === "ark" ? alias
					: alias === "root" ? this.name
					: `${this.name}.${alias}`
				const config = this.resolvedConfig.keywords?.[qualifiedName]
				if (config) def = [def, "@", config]
				return [alias, def]
			}
			if (alias.at(-1) !== ">") {
				throwParseError(
					`'>' must be the last character of a generic declaration in a scope`
				)
			}
			const name = alias.slice(0, firstParamIndex)
			const paramString = alias.slice(firstParamIndex + 1, -1)
			return [
				name,
				// use a thunk definition for the generic so that we can parse
				// constraints within the current scope
				() => {
					const params = this.parseGenericParams(paramString, { alias: name })
					const generic2 = parseGeneric(params, def, this)
					return generic2
				}
			]
		}
		parseGenericParams(def, opts) {
			return parseGenericParamName(
				new ArkTypeScanner(def),
				[],
				this.createParseContext({
					...opts,
					def,
					prefix: "generic"
				})
			)
		}
		normalizeRootScopeValue(resolution) {
			if (isThunk(resolution) && !hasArkKind(resolution, "generic"))
				return resolution()
			return resolution
		}
		preparseOwnDefinitionFormat(def, opts) {
			return {
				...opts,
				def,
				prefix: opts.alias ?? "type"
			}
		}
		parseOwnDefinitionFormat(def, ctx) {
			const isScopeAlias = ctx.alias && ctx.alias in this.aliases
			if (!isScopeAlias && !ctx.args) ctx.args = { this: ctx.id }
			const result = parseInnerDefinition(def, ctx)
			if (isArray(result)) {
				if (result[1] === "=") return throwParseError(shallowDefaultableMessage)
				if (result[1] === "?") return throwParseError(shallowOptionalMessage)
			}
			return result
		}
		unit = value2 => this.units([value2])
		valueOf = tsEnum => this.units(enumValues(tsEnum))
		enumerated = (...values) => this.units(values)
		instanceOf = ctor =>
			this.node("proto", { proto: ctor }, { prereduced: true })
		or = (...defs) => this.schema(defs.map(def => this.parse(def)))
		and = (...defs) =>
			defs.reduce(
				(node2, def) => node2.and(this.parse(def)),
				this.intrinsic.unknown
			)
		merge = (...defs) =>
			defs.reduce(
				(node2, def) => node2.merge(this.parse(def)),
				this.intrinsic.object
			)
		pipe = (...morphs) => this.intrinsic.unknown.pipe(...morphs)
		match = new InternalMatchParser(this)
		declare = () => ({
			type: this.type
		})
		define(def) {
			return def
		}
		type = new InternalTypeParser(this)
		static scope = (def, config = {}) => new _InternalScope(def, config)
		static module = (def, config = {}) => this.scope(def, config).export()
	}
	var scope = Object.assign(InternalScope.scope, {
		define: def => def
	})
	var Scope = InternalScope

	// keywords/builtins.ts
	var MergeHkt = class extends Hkt {
		description =
			'merge an object\'s properties onto another like `Merge(User, { isAdmin: "true" })`'
	}
	var Merge = genericNode(
		["base", intrinsic.object],
		["props", intrinsic.object]
	)(args2 => args2.base.merge(args2.props), MergeHkt)
	var arkBuiltins = Scope.module({
		Key: intrinsic.key,
		Merge
	})

	// keywords/Array.ts
	var liftFromHkt = class extends Hkt {}
	var liftFrom = genericNode("element")(args2 => {
		const nonArrayElement = args2.element.exclude(intrinsic.Array)
		const lifted = nonArrayElement.array()
		return nonArrayElement
			.rawOr(lifted)
			.pipe(liftArray)
			.distribute(
				branch => branch.assertHasKind("morph").declareOut(lifted),
				rootSchema
			)
	}, liftFromHkt)
	var arkArray = Scope.module(
		{
			root: intrinsic.Array,
			readonly: "root",
			index: intrinsic.nonNegativeIntegerString,
			liftFrom
		},
		{
			name: "Array"
		}
	)

	// keywords/FormData.ts
	var value = rootSchema(["string", registry.FileConstructor])
	var parsedFormDataValue = value.rawOr(value.array())
	var parsed = rootSchema({
		meta: "an object representing parsed form data",
		domain: "object",
		index: {
			signature: "string",
			value: parsedFormDataValue
		}
	})
	var arkFormData = Scope.module(
		{
			root: ["instanceof", FormData],
			value,
			parsed,
			parse: rootSchema({
				in: FormData,
				morphs: data => {
					const result = {}
					for (const [k, v] of data) {
						if (k in result) {
							const existing = result[k]
							if (
								typeof existing === "string" ||
								existing instanceof registry.FileConstructor
							)
								result[k] = [existing, v]
							else existing.push(v)
						} else result[k] = v
					}
					return result
				},
				declaredOut: parsed
			})
		},
		{
			name: "FormData"
		}
	)

	// keywords/TypedArray.ts
	var TypedArray = Scope.module(
		{
			Int8: ["instanceof", Int8Array],
			Uint8: ["instanceof", Uint8Array],
			Uint8Clamped: ["instanceof", Uint8ClampedArray],
			Int16: ["instanceof", Int16Array],
			Uint16: ["instanceof", Uint16Array],
			Int32: ["instanceof", Int32Array],
			Uint32: ["instanceof", Uint32Array],
			Float32: ["instanceof", Float32Array],
			Float64: ["instanceof", Float64Array],
			BigInt64: ["instanceof", BigInt64Array],
			BigUint64: ["instanceof", BigUint64Array]
		},
		{
			name: "TypedArray"
		}
	)

	// keywords/constructors.ts
	var omittedPrototypes = {
		Boolean: 1,
		Number: 1,
		String: 1
	}
	var arkPrototypes = Scope.module({
		...flatMorph(
			{ ...ecmascriptConstructors, ...platformConstructors },
			(k, v) => (k in omittedPrototypes ? [] : [k, ["instanceof", v]])
		),
		Array: arkArray,
		TypedArray,
		FormData: arkFormData
	})

	// keywords/number.ts
	var epoch = rootSchema({
		domain: {
			domain: "number",
			meta: "a number representing a Unix timestamp"
		},
		divisor: {
			rule: 1,
			meta: `an integer representing a Unix timestamp`
		},
		min: {
			rule: -864e13,
			meta: `a Unix timestamp after -8640000000000000`
		},
		max: {
			rule: 864e13,
			meta: "a Unix timestamp before 8640000000000000"
		},
		meta: "an integer representing a safe Unix timestamp"
	})
	var integer = rootSchema({
		domain: "number",
		divisor: 1
	})
	var number = Scope.module(
		{
			root: intrinsic.number,
			integer,
			epoch,
			safe: rootSchema({
				domain: {
					domain: "number",
					numberAllowsNaN: false
				},
				min: Number.MIN_SAFE_INTEGER,
				max: Number.MAX_SAFE_INTEGER
			}),
			NaN: ["===", Number.NaN],
			Infinity: ["===", Number.POSITIVE_INFINITY],
			NegativeInfinity: ["===", Number.NEGATIVE_INFINITY]
		},
		{
			name: "number"
		}
	)

	// keywords/string.ts
	var regexStringNode = (regex, description) =>
		node("intersection", {
			domain: "string",
			pattern: {
				rule: regex.source,
				flags: regex.flags,
				meta: description
			}
		})
	var stringIntegerRoot = regexStringNode(
		wellFormedIntegerMatcher,
		"a well-formed integer string"
	)
	var stringInteger = Scope.module(
		{
			root: stringIntegerRoot,
			parse: rootSchema({
				in: stringIntegerRoot,
				morphs: (s, ctx) => {
					const parsed2 = Number.parseInt(s)
					return Number.isSafeInteger(parsed2) ? parsed2 : (
							ctx.error(
								"an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER"
							)
						)
				},
				declaredOut: intrinsic.integer
			})
		},
		{
			name: "string.integer"
		}
	)
	var hex = regexStringNode(/^[0-9a-fA-F]+$/, "hex characters only")
	var base64 = Scope.module(
		{
			root: regexStringNode(
				/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
				"base64-encoded"
			),
			url: regexStringNode(
				/^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}(?:==|%3D%3D)?|[A-Za-z0-9_-]{3}(?:=|%3D)?)?$/,
				"base64url-encoded"
			)
		},
		{
			name: "string.base64"
		}
	)
	var preformattedCapitalize = regexStringNode(/^[A-Z].*$/, "capitalized")
	var capitalize2 = Scope.module(
		{
			root: rootSchema({
				in: "string",
				morphs: s => s.charAt(0).toUpperCase() + s.slice(1),
				declaredOut: preformattedCapitalize
			}),
			preformatted: preformattedCapitalize
		},
		{
			name: "string.capitalize"
		}
	)
	var isLuhnValid = creditCardInput => {
		const sanitized = creditCardInput.replace(/[- ]+/g, "")
		let sum = 0
		let digit
		let tmpNum
		let shouldDouble = false
		for (let i = sanitized.length - 1; i >= 0; i--) {
			digit = sanitized.substring(i, i + 1)
			tmpNum = Number.parseInt(digit, 10)
			if (shouldDouble) {
				tmpNum *= 2
				if (tmpNum >= 10) sum += (tmpNum % 10) + 1
				else sum += tmpNum
			} else sum += tmpNum
			shouldDouble = !shouldDouble
		}
		return !!(sum % 10 === 0 ? sanitized : false)
	}
	var creditCardMatcher =
		/^(?:4[0-9]{12}(?:[0-9]{3,6})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12,15}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11}|6[27][0-9]{14}|^(81[0-9]{14,17}))$/
	var creditCard = rootSchema({
		domain: "string",
		pattern: {
			meta: "a credit card number",
			rule: creditCardMatcher.source
		},
		predicate: {
			meta: "a credit card number",
			predicate: isLuhnValid
		}
	})
	var iso8601Matcher =
		/^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/
	var isParsableDate = s => !Number.isNaN(new Date(s).valueOf())
	var parsableDate = rootSchema({
		domain: "string",
		predicate: {
			meta: "a parsable date",
			predicate: isParsableDate
		}
	}).assertHasKind("intersection")
	var epochRoot = stringInteger.root.internal
		.narrow((s, ctx) => {
			const n = Number.parseInt(s)
			const out = number.epoch(n)
			if (out instanceof ArkErrors) {
				ctx.errors.merge(out)
				return false
			}
			return true
		})
		.configure(
			{
				description: "an integer string representing a safe Unix timestamp"
			},
			"self"
		)
		.assertHasKind("intersection")
	var epoch2 = Scope.module(
		{
			root: epochRoot,
			parse: rootSchema({
				in: epochRoot,
				morphs: s => new Date(s),
				declaredOut: intrinsic.Date
			})
		},
		{
			name: "string.date.epoch"
		}
	)
	var isoRoot = regexStringNode(
		iso8601Matcher,
		"an ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) date"
	).internal.assertHasKind("intersection")
	var iso = Scope.module(
		{
			root: isoRoot,
			parse: rootSchema({
				in: isoRoot,
				morphs: s => new Date(s),
				declaredOut: intrinsic.Date
			})
		},
		{
			name: "string.date.iso"
		}
	)
	var stringDate = Scope.module(
		{
			root: parsableDate,
			parse: rootSchema({
				declaredIn: parsableDate,
				in: "string",
				morphs: (s, ctx) => {
					const date = new Date(s)
					if (Number.isNaN(date.valueOf())) return ctx.error("a parsable date")
					return date
				},
				declaredOut: intrinsic.Date
			}),
			iso,
			epoch: epoch2
		},
		{
			name: "string.date"
		}
	)
	var email = regexStringNode(
		// https://www.regular-expressions.info/email.html
		/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
		"an email address"
	)
	var ipv4Segment = "(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])"
	var ipv4Address = `(${ipv4Segment}[.]){3}${ipv4Segment}`
	var ipv4Matcher = new RegExp(`^${ipv4Address}$`)
	var ipv6Segment = "(?:[0-9a-fA-F]{1,4})"
	var ipv6Matcher = new RegExp(
		`^((?:${ipv6Segment}:){7}(?:${ipv6Segment}|:)|(?:${ipv6Segment}:){6}(?:${ipv4Address}|:${ipv6Segment}|:)|(?:${ipv6Segment}:){5}(?::${ipv4Address}|(:${ipv6Segment}){1,2}|:)|(?:${ipv6Segment}:){4}(?:(:${ipv6Segment}){0,1}:${ipv4Address}|(:${ipv6Segment}){1,3}|:)|(?:${ipv6Segment}:){3}(?:(:${ipv6Segment}){0,2}:${ipv4Address}|(:${ipv6Segment}){1,4}|:)|(?:${ipv6Segment}:){2}(?:(:${ipv6Segment}){0,3}:${ipv4Address}|(:${ipv6Segment}){1,5}|:)|(?:${ipv6Segment}:){1}(?:(:${ipv6Segment}){0,4}:${ipv4Address}|(:${ipv6Segment}){1,6}|:)|(?::((?::${ipv6Segment}){0,5}:${ipv4Address}|(?::${ipv6Segment}){1,7}|:)))(%[0-9a-zA-Z.]{1,})?$`
	)
	var ip = Scope.module(
		{
			root: ["v4 | v6", "@", "an IP address"],
			v4: regexStringNode(ipv4Matcher, "an IPv4 address"),
			v6: regexStringNode(ipv6Matcher, "an IPv6 address")
		},
		{
			name: "string.ip"
		}
	)
	var jsonStringDescription = "a JSON string"
	var writeJsonSyntaxErrorProblem = error => {
		if (!(error instanceof SyntaxError)) throw error
		return `must be ${jsonStringDescription} (${error})`
	}
	var jsonRoot = rootSchema({
		meta: jsonStringDescription,
		domain: "string",
		predicate: {
			meta: jsonStringDescription,
			predicate: (s, ctx) => {
				try {
					JSON.parse(s)
					return true
				} catch (e) {
					return ctx.reject({
						code: "predicate",
						expected: jsonStringDescription,
						problem: writeJsonSyntaxErrorProblem(e)
					})
				}
			}
		}
	})
	var parseJson = (s, ctx) => {
		if (s.length === 0) {
			return ctx.error({
				code: "predicate",
				expected: jsonStringDescription,
				actual: "empty"
			})
		}
		try {
			return JSON.parse(s)
		} catch (e) {
			return ctx.error({
				code: "predicate",
				expected: jsonStringDescription,
				problem: writeJsonSyntaxErrorProblem(e)
			})
		}
	}
	var json = Scope.module(
		{
			root: jsonRoot,
			parse: rootSchema({
				meta: "safe JSON string parser",
				in: "string",
				morphs: parseJson,
				declaredOut: intrinsic.jsonObject
			})
		},
		{
			name: "string.json"
		}
	)
	var preformattedLower = regexStringNode(/^[a-z]*$/, "only lowercase letters")
	var lower = Scope.module(
		{
			root: rootSchema({
				in: "string",
				morphs: s => s.toLowerCase(),
				declaredOut: preformattedLower
			}),
			preformatted: preformattedLower
		},
		{
			name: "string.lower"
		}
	)
	var normalizedForms = ["NFC", "NFD", "NFKC", "NFKD"]
	var preformattedNodes = flatMorph(normalizedForms, (i, form) => [
		form,
		rootSchema({
			domain: "string",
			predicate: s => s.normalize(form) === s,
			meta: `${form}-normalized unicode`
		})
	])
	var normalizeNodes = flatMorph(normalizedForms, (i, form) => [
		form,
		rootSchema({
			in: "string",
			morphs: s => s.normalize(form),
			declaredOut: preformattedNodes[form]
		})
	])
	var NFC = Scope.module(
		{
			root: normalizeNodes.NFC,
			preformatted: preformattedNodes.NFC
		},
		{
			name: "string.normalize.NFC"
		}
	)
	var NFD = Scope.module(
		{
			root: normalizeNodes.NFD,
			preformatted: preformattedNodes.NFD
		},
		{
			name: "string.normalize.NFD"
		}
	)
	var NFKC = Scope.module(
		{
			root: normalizeNodes.NFKC,
			preformatted: preformattedNodes.NFKC
		},
		{
			name: "string.normalize.NFKC"
		}
	)
	var NFKD = Scope.module(
		{
			root: normalizeNodes.NFKD,
			preformatted: preformattedNodes.NFKD
		},
		{
			name: "string.normalize.NFKD"
		}
	)
	var normalize = Scope.module(
		{
			root: "NFC",
			NFC,
			NFD,
			NFKC,
			NFKD
		},
		{
			name: "string.normalize"
		}
	)
	var numericRoot = regexStringNode(
		numericStringMatcher,
		"a well-formed numeric string"
	)
	var numeric = Scope.module(
		{
			root: numericRoot,
			parse: rootSchema({
				in: numericRoot,
				morphs: s => Number.parseFloat(s),
				declaredOut: intrinsic.number
			})
		},
		{
			name: "string.numeric"
		}
	)
	var semverMatcher =
		/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
	var semver = regexStringNode(
		semverMatcher,
		"a semantic version (see https://semver.org/)"
	)
	var preformattedTrim = regexStringNode(
		// no leading or trailing whitespace
		/^\S.*\S$|^\S?$/,
		"trimmed"
	)
	var trim = Scope.module(
		{
			root: rootSchema({
				in: "string",
				morphs: s => s.trim(),
				declaredOut: preformattedTrim
			}),
			preformatted: preformattedTrim
		},
		{
			name: "string.trim"
		}
	)
	var preformattedUpper = regexStringNode(/^[A-Z]*$/, "only uppercase letters")
	var upper = Scope.module(
		{
			root: rootSchema({
				in: "string",
				morphs: s => s.toUpperCase(),
				declaredOut: preformattedUpper
			}),
			preformatted: preformattedUpper
		},
		{
			name: "string.upper"
		}
	)
	var isParsableUrl = s => {
		if (URL.canParse) return URL.canParse(s)
		try {
			new URL(s)
			return true
		} catch {
			return false
		}
	}
	var urlRoot = rootSchema({
		domain: "string",
		predicate: {
			meta: "a URL string",
			predicate: isParsableUrl
		}
	})
	var url = Scope.module(
		{
			root: urlRoot,
			parse: rootSchema({
				declaredIn: urlRoot,
				in: "string",
				morphs: (s, ctx) => {
					try {
						return new URL(s)
					} catch {
						return ctx.error("a URL string")
					}
				},
				declaredOut: rootSchema(URL)
			})
		},
		{
			name: "string.url"
		}
	)
	var uuid = Scope.module(
		{
			// the meta tuple expression ensures the error message does not delegate
			// to the individual branches, which are too detailed
			root: ["versioned | nil | max", "@", "a UUID"],
			"#nil": "'00000000-0000-0000-0000-000000000000'",
			"#max": "'ffffffff-ffff-ffff-ffff-ffffffffffff'",
			"#versioned":
				/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
			v1: regexStringNode(
				/^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
				"a UUIDv1"
			),
			v2: regexStringNode(
				/^[0-9a-f]{8}-[0-9a-f]{4}-2[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
				"a UUIDv2"
			),
			v3: regexStringNode(
				/^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
				"a UUIDv3"
			),
			v4: regexStringNode(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
				"a UUIDv4"
			),
			v5: regexStringNode(
				/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
				"a UUIDv5"
			),
			v6: regexStringNode(
				/^[0-9a-f]{8}-[0-9a-f]{4}-6[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
				"a UUIDv6"
			),
			v7: regexStringNode(
				/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
				"a UUIDv7"
			),
			v8: regexStringNode(
				/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
				"a UUIDv8"
			)
		},
		{
			name: "string.uuid"
		}
	)
	var string = Scope.module(
		{
			root: intrinsic.string,
			alpha: regexStringNode(/^[A-Za-z]*$/, "only letters"),
			alphanumeric: regexStringNode(
				/^[A-Za-z\d]*$/,
				"only letters and digits 0-9"
			),
			hex,
			base64,
			capitalize: capitalize2,
			creditCard,
			date: stringDate,
			digits: regexStringNode(/^\d*$/, "only digits 0-9"),
			email,
			integer: stringInteger,
			ip,
			json,
			lower,
			normalize,
			numeric,
			semver,
			trim,
			upper,
			url,
			uuid
		},
		{
			name: "string"
		}
	)

	// keywords/ts.ts
	var arkTsKeywords = Scope.module({
		bigint: intrinsic.bigint,
		boolean: intrinsic.boolean,
		false: intrinsic.false,
		never: intrinsic.never,
		null: intrinsic.null,
		number: intrinsic.number,
		object: intrinsic.object,
		string: intrinsic.string,
		symbol: intrinsic.symbol,
		true: intrinsic.true,
		unknown: intrinsic.unknown,
		undefined: intrinsic.undefined
	})
	var unknown = Scope.module(
		{
			root: intrinsic.unknown,
			any: intrinsic.unknown
		},
		{
			name: "unknown"
		}
	)
	var json2 = Scope.module(
		{
			root: intrinsic.jsonObject,
			stringify: node("morph", {
				in: intrinsic.jsonObject,
				morphs: data => JSON.stringify(data),
				declaredOut: intrinsic.string
			})
		},
		{
			name: "object.json"
		}
	)
	var object = Scope.module(
		{
			root: intrinsic.object,
			json: json2
		},
		{
			name: "object"
		}
	)
	var RecordHkt = class extends Hkt {
		description =
			'instantiate an object from an index signature and corresponding value type like `Record("string", "number")`'
	}
	var Record = genericNode(["K", intrinsic.key], "V")(
		args2 => ({
			domain: "object",
			index: {
				signature: args2.K,
				value: args2.V
			}
		}),
		RecordHkt
	)
	var PickHkt = class extends Hkt {
		description =
			'pick a set of properties from an object like `Pick(User, "name | age")`'
	}
	var Pick = genericNode(["T", intrinsic.object], ["K", intrinsic.key])(
		args2 => args2.T.pick(args2.K),
		PickHkt
	)
	var OmitHkt = class extends Hkt {
		description =
			'omit a set of properties from an object like `Omit(User, "age")`'
	}
	var Omit = genericNode(["T", intrinsic.object], ["K", intrinsic.key])(
		args2 => args2.T.omit(args2.K),
		OmitHkt
	)
	var PartialHkt = class extends Hkt {
		description =
			"make all named properties of an object optional like `Partial(User)`"
	}
	var Partial = genericNode(["T", intrinsic.object])(
		args2 => args2.T.partial(),
		PartialHkt
	)
	var RequiredHkt = class extends Hkt {
		description =
			"make all named properties of an object required like `Required(User)`"
	}
	var Required2 = genericNode(["T", intrinsic.object])(
		args2 => args2.T.required(),
		RequiredHkt
	)
	var ExcludeHkt = class extends Hkt {
		description =
			'exclude branches of a union like `Exclude("boolean", "true")`'
	}
	var Exclude = genericNode("T", "U")(
		args2 => args2.T.exclude(args2.U),
		ExcludeHkt
	)
	var ExtractHkt = class extends Hkt {
		description =
			'extract branches of a union like `Extract("0 | false | 1", "number")`'
	}
	var Extract = genericNode("T", "U")(
		args2 => args2.T.extract(args2.U),
		ExtractHkt
	)
	var arkTsGenerics = Scope.module({
		Exclude,
		Extract,
		Omit,
		Partial,
		Pick,
		Record,
		Required: Required2
	})

	// keywords/keywords.ts
	var ark = scope(
		{
			...arkTsKeywords,
			...arkTsGenerics,
			...arkPrototypes,
			...arkBuiltins,
			string,
			number,
			object,
			unknown
		},
		{ prereducedAliases: true, name: "ark" }
	)
	var keywords = ark.export()
	Object.assign($arkTypeRegistry.ambient, keywords)
	$arkTypeRegistry.typeAttachments = {
		string: keywords.string.root,
		number: keywords.number.root,
		bigint: keywords.bigint,
		boolean: keywords.boolean,
		symbol: keywords.symbol,
		undefined: keywords.undefined,
		null: keywords.null,
		object: keywords.object.root,
		unknown: keywords.unknown.root,
		false: keywords.false,
		true: keywords.true,
		never: keywords.never,
		arrayIndex: keywords.Array.index,
		Key: keywords.Key,
		Record: keywords.Record,
		Array: keywords.Array.root,
		Date: keywords.Date
	}
	var type = Object.assign(
		ark.type,
		// assign attachments newly parsed in keywords
		// future scopes add these directly from the
		// registry when their TypeParsers are instantiated
		$arkTypeRegistry.typeAttachments
	)
	var match = ark.match
	var generic = ark.generic
	var schema = ark.schema
	var define = ark.define
	var declare = ark.declare

	// module.ts
	var Module = RootModule

	export const MyType = type({
		name: "string",
		age: "number"
	})

	// Return the exports we care about
	return {
		MyType: typeof MyType !== "undefined" ? MyType : undefined,
		out: typeof out !== "undefined" ? out : undefined
	}
})()
