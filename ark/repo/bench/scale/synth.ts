/**
 * A synthetic app of n object schemas, written the same way in ArkType,
 * Valibot, Zod and Zod Mini. Its shapes follow the homepage's shop and saas
 * apps: ids, bounded strings, formats, bounded integers, enums, optional keys
 * with and without defaults, nullables, references to the schemas before,
 * arrays, and every 8th schema a union discriminated by "kind".
 *
 * `messages` and `narrows` then write it as an app of forms: a field with a
 * message of its own, and a string or integer checked by a function. Both draw
 * from a generator of their own, so an app has the same schemas with and
 * without them.
 */
export interface SynthOptions {
	/** limits fields to these kinds */
	kinds?: Field["kind"][]
	/** every key required */
	required?: boolean
	/** no nullable keys */
	nonNullable?: boolean
	/** no unions */
	noUnions?: boolean
	/** the share of fields, other than references and arrays, with a message of their own */
	messages?: number
	/** the share of unformatted strings and integers a function also checks, with its message */
	narrows?: number
}

export interface SynthApp {
	arktype: string
	valibot: string
	zod: string
	zodMini: string
	/** how many of its fields have a message of their own, and how many a narrow */
	messages: number
	narrows: number
}

type Field =
	| { kind: "string"; min?: number; max?: number }
	| { kind: "email" | "uuid" | "url" | "date" | "boolean" | "number" }
	| { kind: "integer"; min?: number; max?: number }
	| { kind: "enum"; values: string[] }
	| { kind: "pattern"; pattern: RegExp }
	| { kind: "ref"; to: number }
	| { kind: "array"; of: Field; max?: number | undefined }

/** a helper each module declares, or a test of `value` written where it's used */
interface Narrow {
	helper?: string
	test?: string
	/** what an integer must be a multiple of, where that's its test */
	step?: number
	message: string
}

interface Prop {
	key: string
	field: Field
	optional?: boolean
	nullable?: boolean
	default?: unknown
	message?: string
	narrow?: Narrow
}

type Schema =
	| { kind: "object"; name: string; props: Prop[] }
	| { kind: "union"; name: string; branches: Prop[][] }

const nouns = [
	"user",
	"account",
	"order",
	"invoice",
	"product",
	"project",
	"issue",
	"comment",
	"team",
	"member",
	"address",
	"payment",
	"shipment",
	"review",
	"ticket",
	"session",
	"device",
	"plan",
	"coupon",
	"report",
	"campaign",
	"message",
	"channel",
	"workspace",
	"document",
	"folder",
	"task",
	"event",
	"booking",
	"vendor",
	"customer",
	"warehouse",
	"category",
	"subscription",
	"refund",
	"contract",
	"lead",
	"deal",
	"asset",
	"release"
]
const words = [
	"name",
	"title",
	"label",
	"summary",
	"description",
	"note",
	"code",
	"reference",
	"handle",
	"nickname",
	"company",
	"street",
	"city",
	"region",
	"country",
	"phone",
	"locale",
	"timezone",
	"source",
	"medium",
	"reason",
	"comment",
	"body",
	"subject",
	"headline",
	"caption",
	"version",
	"branch",
	"owner",
	"color"
]
const counts = [
	"count",
	"quantity",
	"amount",
	"total",
	"priority",
	"rank",
	"score",
	"position",
	"limit",
	"seats",
	"attempts",
	"retries",
	"duration",
	"size",
	"weight",
	"age",
	"level",
	"stock",
	"views",
	"votes"
]
const flags = [
	"enabled",
	"active",
	"archived",
	"verified",
	"public",
	"pinned",
	"locked",
	"draft",
	"featured",
	"muted"
]
const dates = [
	"createdAt",
	"updatedAt",
	"deletedAt",
	"publishedAt",
	"expiresAt",
	"startsAt",
	"endsAt",
	"dueAt",
	"paidAt",
	"sentAt"
]
const enums = [
	["draft", "published", "archived"],
	["low", "medium", "high", "urgent"],
	["USD", "EUR", "GBP", "JPY"],
	["admin", "member", "viewer", "owner"],
	["open", "closed"],
	["pending", "active", "suspended", "cancelled"],
	["free", "team", "enterprise"],
	["email", "sms", "push"],
	["daily", "weekly", "monthly"],
	["visa", "mastercard", "amex"],
	["light", "dark", "system"],
	["north", "south", "east", "west"],
	["queued", "running", "succeeded", "failed"],
	["small", "medium", "large"],
	["read", "write", "admin"]
]
const patterns = [
	/^[A-Z]{2}$/,
	/^\d{4}$/,
	/^#[\da-f]{6}$/,
	/^[\da-z]+(?:-[\da-z]+)*$/,
	/^\+?\d{7,15}$/,
	/^[A-Z]{3}-\d{4}$/,
	/^\d{5}(?:-\d{4})?$/,
	/^[A-Z]{2}\d{2}[\dA-Z]{11,30}$/
]

// the functions a narrow names, declared by each module that has one
const helpers = {
	string: {
		notBlank: {
			source: "(s: string) => s.trim().length > 0",
			mustNot: "be blank"
		},
		isTrimmed: {
			source: "(s: string) => s === s.trim()",
			mustNot: "start or end with a space"
		},
		isSingleLine: {
			source: '(s: string) => !s.includes("\\n")',
			mustNot: "span more than one line"
		},
		isPrintable: {
			source: "(s: string) => !/[\\u0000-\\u001f]/.test(s)",
			mustNot: "contain control characters"
		}
	},
	integer: {
		isSafe: {
			source: "(n: number) => Number.isSafeInteger(n)",
			mustNot: "be too large to count"
		}
	}
} as const

const helpersSource =
	Object.values(helpers)
		.flatMap(group => Object.entries(group))
		.map(([name, { source }]) => `const ${name} = ${source}`)
		.join("\n") + "\n"

const prefixes = ["_", "-", ".", "#"]
const reserved = ["admin", "root", "system", "support", "null", "test"]
const fragments = ["  ", "<", "://", "@"]
const steps = [5, 10, 25, 100]

const pascal = (s: string) => s[0].toUpperCase() + s.slice(1)

// "billingEmail2" as "billing email 2"
const spaced = (key: string) =>
	key
		.replace(/([a-z])([\dA-Z])/g, "$1 $2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
		.toLowerCase()

const camel = (s: string) => s[0].toLowerCase() + s.slice(1)

export const synthOf = (
	n: number,
	seed: number,
	options: SynthOptions = {}
): SynthApp => {
	let state = seed >>> 0
	// mulberry32
	const random = () => {
		state = (state + 0x6d2b79f5) >>> 0
		let t = state
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
	const int = (min: number, max: number) =>
		min + Math.floor(random() * (max - min + 1))
	const pick = <t>(items: readonly t[]): t =>
		items[Math.floor(random() * items.length)]
	const chance = (p: number) => random() < p

	// what messages and narrows draw from, so neither moves a schema's shape
	let decorState = (seed ^ 0x9e3779b9) >>> 0
	const decor = () => {
		decorState = (decorState + 0x6d2b79f5) >>> 0
		let t = decorState
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
	const decorPick = <t>(items: readonly t[]): t =>
		items[Math.floor(decor() * items.length)]

	// half name their schema, as a form's messages do where a field's name alone
	// wouldn't say enough: "Invoice title" beside "Title"
	const labelOf = (key: string, schema: string) =>
		pascal(decor() < 0.5 ? `${spaced(schema)} ${spaced(key)}` : spaced(key))

	const messageOf = (field: Field, label: string): string | undefined => {
		switch (field.kind) {
			case "string":
				return (
					field.min !== undefined && field.max !== undefined ?
						`${label} must be ${field.min} to ${field.max} characters.`
					: field.max !== undefined ?
						`${label} must be at most ${field.max} characters.`
					:	`${label} must be text.`
				)
			case "email":
				return `${label} must be a valid email address.`
			case "uuid":
				return `${label} is not a valid ID.`
			case "url":
				return `${label} must be a valid URL.`
			case "date":
				return `${label} must be a date and time.`
			case "boolean":
				return `${label} must be on or off.`
			case "number":
				return `${label} must be a number.`
			case "integer":
				return field.max !== undefined ?
						`${label} must be a whole number from ${field.min} to ${field.max}.`
					:	`${label} must be a whole number of at least ${field.min}.`
			case "enum":
				return `Choose one of the options for ${label.toLowerCase()}.`
			case "pattern":
				return `${label} is not in the expected format.`
		}
	}

	const narrowOf = (field: Field, label: string): Narrow | undefined => {
		if (field.kind !== "string" && field.kind !== "integer") return
		if (decor() < 0.5) {
			const [helper, { mustNot }] = decorPick(
				Object.entries(helpers[field.kind])
			)
			return { helper, message: `${label} must not ${mustNot}.` }
		}
		if (field.kind === "integer") {
			// no greater than its maximum, so some integer satisfies both
			const { max } = field
			const step = decorPick(
				steps.filter(step => max === undefined || step <= max)
			)
			return {
				test: `value % ${step} === 0`,
				step,
				message: `${label} must be a multiple of ${step}.`
			}
		}
		const roll = decor()
		if (roll < 0.34) {
			const prefix = decorPick(prefixes)
			return {
				test: `!value.startsWith(${JSON.stringify(prefix)})`,
				message: `${label} must not start with ${JSON.stringify(prefix)}.`
			}
		}
		if (roll < 0.67) {
			const word = decorPick(reserved)
			return {
				test: `value.toLowerCase() !== ${JSON.stringify(word)}`,
				message: `${label} must not be ${JSON.stringify(word)}.`
			}
		}
		const fragment = decorPick(fragments)
		return {
			test: `!value.includes(${JSON.stringify(fragment)})`,
			message: `${label} must not contain ${JSON.stringify(fragment)}.`
		}
	}

	const decorate = (prop: Prop, schema: string) => {
		if (!options.messages && !options.narrows) return
		const label = labelOf(prop.key, schema)
		if (options.messages && decor() < options.messages) {
			const message = messageOf(prop.field, label)
			if (message) prop.message = message
		}
		if (options.narrows && decor() < options.narrows) {
			const narrow = narrowOf(prop.field, label)
			if (narrow) prop.narrow = narrow
			// a default its own narrow rejects is a ParseError in ArkType and a
			// value Valibot rejects, so a default of 1 becomes the step itself,
			// which is within the field's bounds
			if (
				narrow?.step &&
				typeof prop.default === "number" &&
				prop.default % narrow.step
			)
				prop.default = narrow.step
		}
	}

	const schemas: Schema[] = []

	const anyFieldOf = (): Field => {
		const objects = schemas.flatMap((s, i) => (s.kind === "object" ? [i] : []))
		const roll = random()
		if (roll < 0.22) {
			const max = pick([20, 50, 64, 100, 200, 500, 2000])
			return (
				chance(0.6) ? { kind: "string", min: 1, max }
				: chance(0.5) ? { kind: "string", max }
				: { kind: "string" }
			)
		}
		if (roll < 0.26) return { kind: "email" }
		if (roll < 0.38) return { kind: "uuid" }
		if (roll < 0.41) return { kind: "url" }
		if (roll < 0.49) return { kind: "date" }
		if (roll < 0.6) {
			const min = pick([0, 0, 1])
			return chance(0.5) ?
					{ kind: "integer", min, max: pick([10, 100, 1000, 10000]) }
				:	{ kind: "integer", min }
		}
		if (roll < 0.63) return { kind: "number" }
		if (roll < 0.7) return { kind: "boolean" }
		if (roll < 0.8) return { kind: "enum", values: pick(enums) }
		if (roll < 0.83) return { kind: "pattern", pattern: pick(patterns) }
		if (roll < 0.9 && objects.length)
			return { kind: "ref", to: pick(objects.slice(-12)) }
		if (roll < 0.94 || !objects.length) {
			return {
				kind: "array",
				of: { kind: "string", max: 50 },
				max: pick([10, 20, undefined])
			}
		}
		return { kind: "array", of: { kind: "ref", to: pick(objects.slice(-12)) } }
	}

	const fieldOf = (): Field => {
		if (!options.kinds) return anyFieldOf()
		for (let tries = 0; tries < 1000; tries++) {
			const field = anyFieldOf()
			if (options.kinds.includes(field.kind)) return field
		}
		// a reference needs an object before it, so the first fields are strings
		return { kind: "string", max: 50 }
	}

	const keyOf = (field: Field, taken: Set<string>): string => {
		const base =
			field.kind === "date" ? pick(dates)
			: field.kind === "boolean" ? pick(flags)
			: field.kind === "integer" || field.kind === "number" ? pick(counts)
			: field.kind === "uuid" ? `${pick(nouns)}Id`
			: field.kind === "email" ?
				pick(["email", "billingEmail", "contactEmail", "replyTo"])
			: field.kind === "url" ?
				pick(["url", "avatarUrl", "homepage", "callbackUrl"])
			: field.kind === "enum" ?
				pick([
					"status",
					"priority",
					"currency",
					"role",
					"kind",
					"tier",
					"channel",
					"theme",
					"state",
					"size"
				])
			: field.kind === "ref" ? camel(schemas[field.to].name)
			: field.kind === "array" ?
				field.of.kind === "ref" ?
					`${camel(schemas[field.of.to].name)}s`
				:	pick(["tags", "aliases", "keywords", "scopes"])
			:	pick(words)
		let key = base
		for (let i = 2; taken.has(key) || key === "kind"; i++) key = `${base}${i}`
		taken.add(key)
		return key
	}

	// no default within a union's branch, as JSON Schema's validators apply none there
	const propsOf = (
		count: number,
		withId: boolean,
		withDefaults: boolean,
		schema: string
	): Prop[] => {
		const taken = new Set<string>()
		const props: Prop[] = []
		if (withId) {
			taken.add("id")
			props.push({ key: "id", field: { kind: "uuid" } })
		}
		while (props.length < count) {
			const field = fieldOf()
			const prop: Prop = { key: keyOf(field, taken), field }
			if (!options.required && chance(0.25)) {
				prop.optional = true
				if (withDefaults) {
					if (field.kind === "boolean" && chance(0.5)) prop.default = false
					else if (field.kind === "enum" && chance(0.4))
						prop.default = field.values[0]
					else if (field.kind === "integer" && chance(0.3))
						prop.default = field.min ?? 0
				}
			} else if (
				!options.nonNullable &&
				chance(0.1) &&
				(field.kind === "string" ||
					field.kind === "date" ||
					field.kind === "uuid" ||
					field.kind === "ref")
			)
				prop.nullable = true
			decorate(prop, schema)
			props.push(prop)
		}
		return props
	}

	const usedNames = new Set<string>()
	for (let i = 0; i < n; i++) {
		let name = pascal(pick(nouns))
		for (let k = 2; usedNames.has(name); k++)
			name = `${pascal(pick(nouns))}${pascal(pick(["detail", "summary", "input", "update", "record", "entry", "view", "draft"]))}${k > 6 ? k : ""}`
		usedNames.add(name)
		if (i % 8 === 7 && !options.noUnions) {
			const branches = Array.from({ length: int(2, 4) }, () =>
				propsOf(int(2, 5), false, false, name)
			)
			schemas.push({ kind: "union", name, branches })
		} else {
			const count = int(3, 10)
			schemas.push({
				kind: "object",
				name,
				props: propsOf(count, chance(0.8), true, name)
			})
		}
	}

	const props = schemas.flatMap(s =>
		s.kind === "object" ? s.props : s.branches.flat()
	)
	return {
		arktype: arktypeOf(schemas, !!options.narrows),
		valibot: valibotOf(schemas, !!options.narrows),
		zod: zodOf(schemas, !!options.narrows),
		zodMini: zodMiniOf(schemas, !!options.narrows),
		messages: props.filter(p => p.message).length,
		narrows: props.filter(p => p.narrow).length
	}
}

const narrowFunctionOf = ({ helper, test }: Narrow) =>
	helper ?? `value => ${test}`

const kindsOf = (schema: Schema & { kind: "union" }) =>
	schema.branches.map(
		(_, i) =>
			`${camel(schema.name)}.${["created", "updated", "deleted", "moved"][i]}`
	)

const kindProp = (kind: string): Prop => ({
	key: "kind",
	field: { kind: "enum", values: [kind] }
})

const arktypeOf = (schemas: Schema[], withHelpers: boolean) => {
	const stringOf = (f: Field): string | undefined => {
		switch (f.kind) {
			case "string":
				return (
					f.min !== undefined && f.max !== undefined ?
						`${f.min} <= string <= ${f.max}`
					: f.max !== undefined ? `string <= ${f.max}`
					: "string"
				)
			case "email":
				return "string.email"
			case "uuid":
				return "string.uuid"
			case "url":
				return "string.url"
			case "date":
				return "string.date.iso"
			case "boolean":
			case "number":
				return f.kind
			case "integer":
				return f.max !== undefined ?
						`${f.min} <= number.integer <= ${f.max}`
					:	`number.integer >= ${f.min}`
			case "enum":
				return f.values.map(v => `'${v}'`).join(" | ")
		}
	}
	// a field with a message or a narrow is a Type of its own, which a
	// definition's string can't configure
	const decoratedOf = (prop: Prop): string => {
		const { field, nullable, message, narrow } = prop
		const s = stringOf(field)
		const base = `type(${s === undefined ? String((field as Field & { kind: "pattern" }).pattern) : JSON.stringify(s)})`
		const configured =
			message ?
				`${base}.configure({ message: ${JSON.stringify(message)} })`
			:	base
		const narrowed =
			narrow ?
				`${configured}.narrow((value, ctx) => ${narrow.helper ? `${narrow.helper}(value)` : narrow.test} || ctx.reject({ message: ${JSON.stringify(narrow.message)} }))`
			:	configured
		const nulled = nullable ? `${narrowed}.or("null")` : narrowed
		return prop.default === undefined ?
				nulled
			:	`${nulled}.default(${JSON.stringify(prop.default)})`
	}
	const valueOf = (prop: Prop): string => {
		const { field, nullable, default: value } = prop
		if (prop.message || prop.narrow) return decoratedOf(prop)
		const s = stringOf(field)
		if (s !== undefined) {
			const defaultSuffix =
				value === undefined ? ""
				: typeof value === "string" ? ` = '${value}'`
				: ` = ${value}`
			return JSON.stringify(`${s}${nullable ? " | null" : ""}${defaultSuffix}`)
		}
		if (field.kind === "pattern") return String(field.pattern)
		if (field.kind === "ref") {
			const name = schemas[field.to].name
			return nullable ? `${name}.or("null")` : name
		}
		const { of, max } = field as Field & { kind: "array" }
		if (of.kind === "ref") return `${schemas[of.to].name}.array()`
		return JSON.stringify(`(${stringOf(of)})[]${max ? ` <= ${max}` : ""}`)
	}
	const objectOf = (props: Prop[]) =>
		`type({ ${props.map(p => `${JSON.stringify(p.key + (p.optional && p.default === undefined ? "?" : ""))}: ${valueOf(p)}`).join(", ")} })`
	const lines = [
		`import { type } from "arktype"`,
		...(withHelpers ? ["", helpersSource.trimEnd()] : []),
		""
	]
	for (const s of schemas) {
		if (s.kind === "object")
			lines.push(`export const ${s.name} = ${objectOf(s.props)}`)
		else {
			const kinds = kindsOf(s)
			const [first, ...rest] = s.branches.map((branch, i) =>
				objectOf([kindProp(kinds[i]), ...branch])
			)
			lines.push(
				`export const ${s.name} = ${first}${rest.map(b => `.or(${b})`).join("")}`
			)
		}
	}
	return lines.join("\n") + "\n"
}

const valibotOf = (schemas: Schema[], withHelpers: boolean) => {
	// a message is the last argument of the check it's for, or of the schema
	// where nothing checks it, and where two checks would repeat it,
	// v.message() sets it for both
	const checkedOf = (
		base: string,
		checks: (message: string) => string[],
		{ message, narrow }: Pick<Prop, "message" | "narrow">
	): string => {
		const plain = checks("")
		const narrowCheck =
			narrow ?
				[
					`v.check(${narrowFunctionOf(narrow)}, ${JSON.stringify(narrow.message)})`
				]
			:	[]
		const pipeOf = (schema: string, actions: string[]) =>
			actions.length ? `v.pipe(${[schema, ...actions].join(", ")})` : schema
		if (!message) return pipeOf(`v.${base}()`, [...plain, ...narrowCheck])
		const text = JSON.stringify(message)
		if (plain.length === 0) return pipeOf(`v.${base}(${text})`, narrowCheck)
		if (plain.length === 1)
			return pipeOf(`v.${base}()`, [...checks(text), ...narrowCheck])
		return pipeOf(
			`v.message(${pipeOf(`v.${base}()`, plain)}, ${text})`,
			narrowCheck
		)
	}
	// "" for a check without a message, else its argument
	const arg = (message: string) => (message ? `, ${message}` : "")
	const fieldOf = (
		f: Field,
		decor: Pick<Prop, "message" | "narrow"> = {}
	): string => {
		switch (f.kind) {
			case "string":
				return checkedOf(
					"string",
					m => [
						...(f.min !== undefined ? [`v.minLength(${f.min}${arg(m)})`] : []),
						...(f.max !== undefined ? [`v.maxLength(${f.max}${arg(m)})`] : [])
					],
					decor
				)
			case "email":
				return checkedOf("string", m => [`v.email(${m})`], decor)
			case "uuid":
				return checkedOf("string", m => [`v.uuid(${m})`], decor)
			case "url":
				return checkedOf("string", m => [`v.url(${m})`], decor)
			case "date":
				return checkedOf("string", m => [`v.isoTimestamp(${m})`], decor)
			case "boolean":
				return checkedOf("boolean", () => [], decor)
			case "number":
				return checkedOf("number", () => [], decor)
			case "integer":
				return checkedOf(
					"number",
					m => [
						`v.integer(${m})`,
						`v.minValue(${f.min}${arg(m)})`,
						...(f.max !== undefined ? [`v.maxValue(${f.max}${arg(m)})`] : [])
					],
					decor
				)
			case "enum":
				return `v.picklist(${JSON.stringify(f.values)}${decor.message ? `, ${JSON.stringify(decor.message)}` : ""})`
			case "pattern":
				return checkedOf(
					"string",
					m => [`v.regex(${f.pattern}${arg(m)})`],
					decor
				)
			case "ref":
				return schemas[f.to].name
			case "array":
				return f.max ?
						`v.pipe(v.array(${fieldOf(f.of)}), v.maxLength(${f.max}))`
					:	`v.array(${fieldOf(f.of)})`
		}
	}
	const valueOf = (p: Prop) => {
		const field = fieldOf(p.field, p)
		const s = p.nullable ? `v.nullable(${field})` : field
		return p.optional ?
				`v.optional(${s}${p.default !== undefined ? `, ${JSON.stringify(p.default)}` : ""})`
			:	s
	}
	const entriesOf = (props: Prop[]) =>
		props.map(p => `${JSON.stringify(p.key)}: ${valueOf(p)}`).join(", ")
	const lines = [
		`import * as v from "valibot"`,
		...(withHelpers ? ["", helpersSource.trimEnd()] : []),
		""
	]
	for (const s of schemas) {
		if (s.kind === "object")
			lines.push(`export const ${s.name} = v.object({ ${entriesOf(s.props)} })`)
		else {
			const kinds = kindsOf(s)
			const branches = s.branches.map(
				(branch, i) =>
					`v.object({ kind: v.literal(${JSON.stringify(kinds[i])}), ${entriesOf(branch)} })`
			)
			lines.push(
				`export const ${s.name} = v.variant("kind", [${branches.join(", ")}])`
			)
		}
	}
	return lines.join("\n") + "\n"
}

/** how Zod and Zod Mini each write what a field is made of */
interface ZodDialect {
	module: string
	/** a schema with its checks, each written as zod/mini's function is: `z.minLength(1)` */
	checked: (schema: string, checks: string[]) => string
	integer: (message: string) => string
	wrapped: (wrapper: "nullable" | "optional", schema: string) => string
	defaulted: (schema: string, value: string) => string
}

const zodDialect: ZodDialect = {
	module: "zod",
	// z.minLength(1) as .min(1), z.refine(f) as .refine(f)
	checked: (schema, checks) =>
		schema +
		checks
			.map(
				check =>
					`.${check.slice(2).replace(/^(min|max)(?:Length|imum)\(/, "$1(")}`
			)
			.join(""),
	integer: message => `z.number().int(${message})`,
	wrapped: (wrapper, schema) => `${schema}.${wrapper}()`,
	defaulted: (schema, value) => `${schema}.default(${value})`
}

const zodMiniDialect: ZodDialect = {
	module: "zod/mini",
	checked: (schema, checks) =>
		checks.length ? `${schema}.check(${checks.join(", ")})` : schema,
	integer: message => `z.int(${message})`,
	wrapped: (wrapper, schema) => `z.${wrapper}(${schema})`,
	defaulted: (schema, value) => `z._default(${schema}, ${value})`
}

// Zod has no message for a schema's every check, so each check takes it
const zodWith =
	({ module, checked, integer, wrapped, defaulted }: ZodDialect) =>
	(schemas: Schema[], withHelpers: boolean) => {
		const fieldOf = (
			f: Field,
			{ message, narrow }: Pick<Prop, "message" | "narrow"> = {}
		): string => {
			const text = message ? JSON.stringify(message) : ""
			const arg = text ? `, ${text}` : ""
			const refined = (schema: string, checks: string[] = []) =>
				checked(schema, [
					...checks,
					...(narrow ?
						[
							`z.refine(${narrowFunctionOf(narrow)}, ${JSON.stringify(narrow.message)})`
						]
					:	[])
				])
			switch (f.kind) {
				case "string": {
					const checks = [
						...(f.min !== undefined ? [`z.minLength(${f.min}${arg})`] : []),
						...(f.max !== undefined ? [`z.maxLength(${f.max}${arg})`] : [])
					]
					return refined(`z.string(${checks.length ? "" : text})`, checks)
				}
				case "email":
					return refined(`z.email(${text})`)
				case "uuid":
					return refined(`z.uuid(${text})`)
				case "url":
					return refined(`z.url(${text})`)
				case "date":
					return refined(`z.iso.datetime(${text})`)
				case "boolean":
					return refined(`z.boolean(${text})`)
				case "number":
					return refined(`z.number(${text})`)
				case "integer":
					return refined(integer(text), [
						`z.minimum(${f.min}${arg})`,
						...(f.max !== undefined ? [`z.maximum(${f.max}${arg})`] : [])
					])
				case "enum":
					return `z.enum(${JSON.stringify(f.values)}${arg})`
				case "pattern":
					return refined("z.string()", [`z.regex(${f.pattern}${arg})`])
				case "ref":
					return schemas[f.to].name
				case "array":
					return checked(
						`z.array(${fieldOf(f.of)})`,
						f.max ? [`z.maxLength(${f.max})`] : []
					)
			}
		}
		const valueOf = (p: Prop) => {
			const field = fieldOf(p.field, p)
			const s = p.nullable ? wrapped("nullable", field) : field
			return (
				!p.optional ? s
				: p.default !== undefined ? defaulted(s, JSON.stringify(p.default))
				: wrapped("optional", s)
			)
		}
		const entriesOf = (props: Prop[]) =>
			props.map(p => `${JSON.stringify(p.key)}: ${valueOf(p)}`).join(", ")
		const lines = [
			`import * as z from "${module}"`,
			...(withHelpers ? ["", helpersSource.trimEnd()] : []),
			""
		]
		for (const s of schemas) {
			if (s.kind === "object") {
				lines.push(
					`export const ${s.name} = z.object({ ${entriesOf(s.props)} })`
				)
			} else {
				const kinds = kindsOf(s)
				const branches = s.branches.map(
					(branch, i) =>
						`z.object({ kind: z.literal(${JSON.stringify(kinds[i])}), ${entriesOf(branch)} })`
				)
				lines.push(
					`export const ${s.name} = z.discriminatedUnion("kind", [${branches.join(", ")}])`
				)
			}
		}
		return lines.join("\n") + "\n"
	}

const zodOf = zodWith(zodDialect)

const zodMiniOf = zodWith(zodMiniDialect)

export type SynthLibrary = "arktype" | "valibot" | "zod" | "zodMini"

export const synthLibraries: readonly SynthLibrary[] = [
	"arktype",
	"valibot",
	"zod",
	"zodMini"
]

const exported = "export const "

/**
 * An app's source as modules of `perModule` schemas, by each module's path
 * from the app's directory: `arktype.ts`, exporting what each of
 * `arktype/m0.ts`, `arktype/m1.ts`… defines, which import the schemas they
 * refer to and the helpers their narrows name from `arktype/helpers.ts`. An
 * app's schemas are a line each, so its modules are its lines.
 */
export const modulesOf = (
	library: SynthLibrary,
	source: string,
	perModule: number
): Record<string, string> => {
	const lines = source.trimEnd().split("\n")
	const [libraryImport] = lines
	const definitions = lines.filter(line => line.startsWith(exported))
	const nameOf = (line: string) =>
		line.slice(exported.length, line.indexOf(" ="))
	const moduleOf = new Map(
		definitions.map((line, i) => [nameOf(line), Math.floor(i / perModule)])
	)
	const helperNames = Object.values(helpers).flatMap(group =>
		Object.keys(group)
	)
	const files: Record<string, string> = {}
	const count = Math.ceil(definitions.length / perModule)
	for (let m = 0; m < count; m++) {
		const body = definitions
			.slice(m * perModule, (m + 1) * perModule)
			.join("\n")
		// a schema's name within a string is a word of a key or a message
		const code = body.replace(/"(?:[^"\\]|\\.)*"/g, '""')
		const identifiers = new Set(code.match(/\b[A-Za-z]\w*\b/g))
		const importsBy: Record<string, string[]> = {}
		for (const name of identifiers) {
			const from = moduleOf.get(name)
			if (from !== undefined && from !== m)
				(importsBy[`m${from}`] ??= []).push(name)
		}
		const used = helperNames.filter(name => identifiers.has(name))
		if (used.length) importsBy.helpers = used
		files[`${library}/m${m}.ts`] =
			[
				libraryImport,
				...Object.entries(importsBy).map(
					([from, names]) =>
						`import { ${names.join(", ")} } from "./${from}.ts"`
				),
				"",
				body
			].join("\n") + "\n"
	}
	if (source.includes(helpersSource)) {
		files[`${library}/helpers.ts`] = helpersSource.replace(
			/^const /gm,
			exported
		)
	}
	files[`${library}.ts`] =
		Array.from(
			{ length: count },
			(_, m) => `export * from "./${library}/m${m}.ts"`
		).join("\n") + "\n"
	return files
}
