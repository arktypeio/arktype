/**
 * A synthetic app of n object schemas, written the same way in ArkType and
 * Valibot. Its shapes follow the homepage's shop and saas apps: ids, bounded
 * strings, formats, bounded integers, enums, optional keys with and without
 * defaults, nullables, references to the schemas before, arrays, and every
 * 8th schema a union discriminated by "kind".
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
}

export interface SynthApp {
	arktype: string
	valibot: string
}

type Field =
	| { kind: "string"; min?: number; max?: number }
	| { kind: "email" | "uuid" | "url" | "date" | "boolean" | "number" }
	| { kind: "integer"; min?: number; max?: number }
	| { kind: "enum"; values: string[] }
	| { kind: "pattern"; pattern: RegExp }
	| { kind: "ref"; to: number }
	| { kind: "array"; of: Field; max?: number | undefined }

interface Prop {
	key: string
	field: Field
	optional?: boolean
	nullable?: boolean
	default?: unknown
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

const pascal = (s: string) => s[0].toUpperCase() + s.slice(1)

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
		withDefaults: boolean
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
				propsOf(int(2, 5), false, false)
			)
			schemas.push({ kind: "union", name, branches })
		} else {
			const count = int(3, 10)
			schemas.push({
				kind: "object",
				name,
				props: propsOf(count, chance(0.8), true)
			})
		}
	}

	return {
		arktype: arktypeOf(schemas),
		valibot: valibotOf(schemas)
	}
}

const kindsOf = (schema: Schema & { kind: "union" }) =>
	schema.branches.map(
		(_, i) =>
			`${camel(schema.name)}.${["created", "updated", "deleted", "moved"][i]}`
	)

const kindProp = (kind: string): Prop => ({
	key: "kind",
	field: { kind: "enum", values: [kind] }
})

const arktypeOf = (schemas: Schema[]) => {
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
	const valueOf = ({ field, nullable, default: value }: Prop): string => {
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
	const lines = [`import { type } from "arktype"`, ""]
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

const valibotOf = (schemas: Schema[]) => {
	const fieldOf = (f: Field): string => {
		switch (f.kind) {
			case "string": {
				const checks = [
					f.min !== undefined && `v.minLength(${f.min})`,
					f.max !== undefined && `v.maxLength(${f.max})`
				].filter(Boolean)
				return checks.length ?
						`v.pipe(v.string(), ${checks.join(", ")})`
					:	"v.string()"
			}
			case "email":
				return "v.pipe(v.string(), v.email())"
			case "uuid":
				return "v.pipe(v.string(), v.uuid())"
			case "url":
				return "v.pipe(v.string(), v.url())"
			case "date":
				return "v.pipe(v.string(), v.isoTimestamp())"
			case "boolean":
				return "v.boolean()"
			case "number":
				return "v.number()"
			case "integer": {
				const checks = [
					"v.integer()",
					`v.minValue(${f.min})`,
					f.max !== undefined && `v.maxValue(${f.max})`
				].filter(Boolean)
				return `v.pipe(v.number(), ${checks.join(", ")})`
			}
			case "enum":
				return `v.picklist(${JSON.stringify(f.values)})`
			case "pattern":
				return `v.pipe(v.string(), v.regex(${f.pattern}))`
			case "ref":
				return schemas[f.to].name
			case "array":
				return f.max ?
						`v.pipe(v.array(${fieldOf(f.of)}), v.maxLength(${f.max}))`
					:	`v.array(${fieldOf(f.of)})`
		}
	}
	const valueOf = (p: Prop) => {
		const s = p.nullable ? `v.nullable(${fieldOf(p.field)})` : fieldOf(p.field)
		return p.optional ?
				`v.optional(${s}${p.default !== undefined ? `, ${JSON.stringify(p.default)}` : ""})`
			:	s
	}
	const entriesOf = (props: Prop[]) =>
		props.map(p => `${JSON.stringify(p.key)}: ${valueOf(p)}`).join(", ")
	const lines = [`import * as v from "valibot"`, ""]
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
