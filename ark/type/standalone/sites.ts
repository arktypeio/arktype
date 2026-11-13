import {
	$ark,
	type ArkErrorCode,
	type BaseNode,
	type BaseRoot,
	type RootUnit
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	describesData,
	errorWriters,
	errorWritersByCode,
	type Custom,
	type FailureSite,
	type SiteContext,
	type UnionSite
} from "@ark/schema/internal"
import {
	type Fn,
	hasDomain,
	isDotAccessible,
	readsOnlyData,
	throwParseError
} from "@ark/util"
import * as runtime from "../runtimeExports.ts"
import type { IssueFeatures } from "./baking.ts"
import { rootUnitsOf } from "./compilers.ts"
import { printedHoleNamePattern } from "./keys.ts"
import { declares, writtenSelectedOf } from "./units.ts"
import {
	runtimeKeyOf,
	runtimePathsByValue,
	writeUnprecompilableMessage
} from "./values.ts"

// the text a site's issue carries in place of what the runtime writes
const describingKeys = ["expected", "actual", "message"] as const

// a site's text is written from the program's config, so a scope's own isn't, nor a callback's
export const assertDescribed = (root: BaseRoot): void => {
	const config = root.$.cfg
	const raisable = raisableCodesOf(root)
	let code: ArkErrorCode
	for (code in errorWritersByCode) {
		if (raisable !== "any" && !raisable.has(code)) continue
		for (const k of describingKeys) {
			const writer = config[code][k]
			if (writer === $ark.defaultConfig[code][k]) continue
			const reason =
				writer !== $ark.cfg![code][k] ? `a scope's configured ${code} ${k}`
					// a callback raises with code predicate unless it names another
				: raisable === "any" && code === "predicate" ?
					`a configured ${code} ${k} that a narrow or morph raises`
				: (
					typeof writer === "function" &&
					k !== "actual" &&
					unwritableCodes.has(code)
				) ?
					`a configured ${code} ${k} writer, which reads each branch's errors`
				:	undefined
			if (reason) throwParseError(writeUnprecompilableMessage(reason))
		}
	}
	for (const node of writtenSelectedOf(rootUnitsOf(root), isUnion)) {
		for (const k of describingKeys) {
			if (k !== "actual" && typeof node.meta[k] === "function") {
				throwParseError(
					writeUnprecompilableMessage(
						`\`${node.expression}\`'s ${k} writer, which reads each branch's errors`
					)
				)
			}
		}
	}
}

const raisableCodesByRoot = new WeakMap<BaseRoot, "any" | Set<ArkErrorCode>>()

// a callback can raise any code
const raisableCodesOf = (root: BaseRoot): "any" | Set<ArkErrorCode> => {
	let codes = raisableCodesByRoot.get(root)
	if (!codes) raisableCodesByRoot.set(root, (codes = readRaisableCodes(root)))
	return codes
}

const readRaisableCodes = (root: BaseRoot): "any" | Set<ArkErrorCode> => {
	if (declares(root, node => node.is("predicate") || node.is("morph")))
		return "any"
	const codes = new Set<ArkErrorCode>()
	for (const unit of rootUnitsOf(root)) {
		for (const ref of unit.refs) {
			if (!failureSites.has(ref as object)) continue
			const site = ref as FailureSite
			if (site.code) codes.add(site.code)
			if (site.v) codes.add(site.v.code)
			if (site.m) codes.add(site.m.code)
		}
		for (const node of unit.declared) {
			if (node.is("union")) {
				// its branches' issues listed, even a discriminated union's
				// where it can't read its discriminant
				codes.add("union")
				if (node.discriminant) codes.add("discriminant")
			} else if (node.is("structure") && node.undeclared === "reject")
				codes.add("undeclared")
		}
	}
	return codes
}

// a callback may raise an issue at any path, with any text
export const addIssueFeatures = (
	features: IssueFeatures,
	units: readonly RootUnit[],
	written: readonly BaseNode[]
): void => {
	for (const node of written) {
		if (node.is("sequence")) features.reportsIndices = true
		else if (node.is("structure")) {
			// an index signature's keys come from data, as do the undeclared
			// keys a structure rejects
			if (
				node.index ||
				node.undeclared === "reject" ||
				node.props.some(
					prop => typeof prop.key === "symbol" || !isDotAccessible(prop.key)
				)
			)
				features.bracketsKeys = true
		} else if (
			node.is("morph") ||
			(node.is("predicate") && !raisesNothing(node.predicate))
		) {
			features.reportsIndices = true
			features.bracketsKeys = true
			features.writesText = true
			features.readsErrors = true
		} else if (node.is("union") && node.tfs) {
			features.transformsBranches = true
			if (node.hasMorph || node.hasAlias) features.failsInBranches = true
		}
	}
	for (const unit of units) {
		for (const [, source] of unit.members) {
			if (addsUnionIssue.test(source)) features.listsUnions = true
			if (appliesValue.test(source)) features.appliesValues = true
			if (discriminatesBoolean.test(source))
				features.discriminatesBooleans = true
		}
		for (const ref of unit.refs) {
			if (!failureSites.has(ref as object)) continue
			const site = ref as FailureSite
			if (site.v) features.readsKeySites = true
			const contexts = [site, site.v, site.m] as (IssueContext | undefined)[]
			if (contexts.some(writesText)) features.writesText = true
		}
	}
}

const isUnion = (node: BaseNode): boolean => node.is("union")

// what makes a checker apply a value itself
const appliesValue =
	/runtime\.(?:morphing|readingCtx|holdingAlias|aliasedValue|aliasedMember)\(/

// a string key written alike may match too, where it's only read needlessly
const discriminatesBoolean =
	/runtime\.discriminate\("(?:[^"\\]|\\.)*", { (?:true|false): /

// what adds a union's issue of its branches'
const addsUnionIssue =
	/runtime\.(?:failsBranches|failsListed|union|discriminateOr)\(/

// a message set apart from its path, or text written from the program's
// config, each noted or set by a call on its issue
const writesText = (context: IssueContext | undefined) =>
	!!context?.c || !!context?.written

// sites only traversal reads, emitted as-is
export const failureSites = new WeakSet<object>()

export const issueSite = <site extends object>(site: site): site => {
	failureSites.add(site)
	return site
}

// a site of a code and description naming nothing the validator receives
export const isInlineSite = (site: object): site is IssueContext => {
	const { written, description, message } = site as IssueContext
	return (
		"code" in site &&
		!written &&
		![description, message].some(text => text?.match(printedHoleNamePattern))
	)
}

const siteWords = new Set([
	"runtime",
	"void",
	"siteOf",
	"customSiteOf",
	"keySiteOf",
	"requiredSiteOf",
	"v",
	"p",
	"m"
])

// a site written from literals alone, so alike in every unit
export const isLiteralSite = (value: unknown, emitted: string): boolean =>
	hasDomain(value, "object") &&
	failureSites.has(value) &&
	(withoutStrings(emitted).match(/[$A-Z_a-z][\w$]*/g) ?? []).every(word =>
		siteWords.has(word)
	)

// every string the code holds is JSON, and no other literal can contain a quote
export const withoutStrings = (code: string): string =>
	code.replace(/"(?:[^"\\]|\\.)*"/g, '""')

// a key's site expects its value's brief where the key is missing, unless that's its basis's
export const writeSiteOf = (
	{ code, description, message, c }: IssueContext,
	emit: (s: string) => string,
	writer = "siteOf",
	missing?: string
): string => {
	const args =
		writer === "keySiteOf" ?
			[code, description, missing === description ? undefined : missing]
			// a message configured for its Type is what customSiteOf takes one as
		:	[code, description, message, c === 1 ? undefined : c]
	while (args[args.length - 1] === undefined) args.pop()
	return `runtime.${
		writer === "keySiteOf" ? writer
		: c ? "customSiteOf"
		: "siteOf"
	}(${args
		.map(arg =>
			arg === undefined ? "void 0"
			: typeof arg === "number" ? arg
			: emit(arg)
		)
		.join(", ")})`
}

// its value's brief, as arktype's is, unless the program configures required's expected
export const missingDescriptionOf = (site: object): string | undefined => {
	const { m: missing } = site as { m?: IssueContext }
	return (
			missing &&
				missing.code === "required" &&
				isInlineSite(missing) &&
				isDescribed(missing)
		) ?
			missing.description
		:	undefined
}

const issueSitesByContext = new WeakMap<
	object,
	{ alone?: object; required?: object }
>()

export interface TextContext {
	code: ArkErrorCode
	description?: string | undefined
	/** a required key's: its value's brief, which the missing key expects */
	missingValueDescription?: string | undefined
	/** a required key's: its value's meta, whose message the missing key says */
	valueMeta?: ArkEnv.meta | undefined
	meta?: ArkEnv.meta | undefined
}

type DescribingKey = (typeof describingKeys)[number]

// a program's configure() writer, which the runtime receives when it runs
export class ConfiguredWriter {
	code: ArkErrorCode
	k: DescribingKey

	constructor(code: ArkErrorCode, k: DescribingKey) {
		this.code = code
		this.k = k
	}
}

export type Writer = string | Fn | ConfiguredWriter | undefined

// what a site's issue reads, with text configured as strings or functions.
// Its message names no path, and c says how it was configured where a summary
// doesn't write it after its path as what's expected
export interface IssueContext extends SiteContext {
	message?: string
	written?: {
		context: object
		writers: Writer[]
		// 1 if the issue takes expected, 4 if its actual describes its data,
		// which a default message leaves out, and 2 or 8 if its message is
		// configured for its Type or for its code
		keeps: number
	}
}

const keepsOf = (
	takesExpected: boolean,
	c: Custom | undefined,
	describes: boolean
): number =>
	+takesExpected |
	(c === 1 ? 2
	: c === 2 ? 8
	: 0) |
	(+describes << 2)

// what a default actual writes: what arktype describes data with, where a
// configured message reads it, shipped as the runtime's
const describerOf = (
	writer: unknown,
	readsActual: boolean
): Writer | undefined => {
	if (!describesData(writer)) return
	if (!readsActual) return ""
	// e.g. a union's or a predicate's, which describe a site's data by its kind
	return runtimeKeyOf(writer as Fn) ? (writer as Fn) : runtime.printKind
}

// arktype passes a writer of these each branch's errors, which issues don't hold
const unwritableCodes = new Set<ArkErrorCode>([
	"union",
	"discriminant",
	"intersection"
])

// the text arktype writes from meta, then the program's config for the code
export const issueContextOf = (context: TextContext): IssueContext => {
	const { code } = context
	const configured: Record<string, unknown> = $ark.cfg![code]
	const defaults: Record<string, unknown> = $ark.defaultConfig[code]
	const meta: Record<string, unknown> = context.meta ?? {}
	const custom: Partial<Record<DescribingKey, unknown>> = {}
	for (const k of describingKeys) {
		const writer = meta[k] ?? configured[k]
		if (writer !== defaults[k]) custom[k] = writer
	}
	// a message written out for a key's value is the missing key's too, as
	// arktype's is, before one configured for the code
	const ofValue =
		code === "required" && meta.message === undefined ?
			context.valueMeta?.message
		:	undefined
	if (typeof ofValue === "string") custom.message = ofValue
	// its Type's message is a union's to share, unlike its code's
	const c: Custom | undefined =
		custom.message === undefined ? undefined
		: meta.message !== undefined || custom.message === ofValue ? 1
		: 2
	const locale = $ark.cfg!.locale
	const issueContext: IssueContext = {
		code,
		description:
			typeof custom.expected === "string" ? custom.expected
			: context.description !== undefined ? context.description
			: context.missingValueDescription
	}
	if (
		!unwritableCodes.has(code) &&
		Object.values(custom).some(writer => typeof writer === "function")
	) {
		const describer =
			custom.actual === undefined ?
				describerOf(defaults.actual, typeof custom.message === "function")
			:	undefined
		const writerOf = (k: DescribingKey): Writer => {
			if (k === "actual" && describer !== undefined) return describer
			const writer = custom[k] ?? defaults[k]
			if (typeof writer !== "function") return writer as Writer
			if (writer === custom[k]) {
				return meta[k] === undefined ?
						new ConfiguredWriter(code, k)
					:	(writer as Fn)
			}
			// static, so written as arktype would write it
			if (k === "expected") return (writer as Fn)(context, locale) as string
			if (runtimeKeyOf(writer)) return writer as Fn
			if (k === "message") return runtime.writeMessage
			// e.g. a missing key's
			return (writer as Fn)(undefined, context, locale) as string
		}
		issueContext.written = {
			context,
			writers: describingKeys.map(writerOf),
			keeps: keepsOf(custom.expected !== undefined, c, !!describer)
		}
		return issueContext
	}
	// a union with no description says the message configured for it, a
	// sentence set apart from its path, and expects what its branches do
	// unless that's configured too. What it's configured to expect alone is
	// written after `must be` and its path, as any site's is
	if (
		code === "union" &&
		(meta.description === undefined || meta.keyword !== undefined) &&
		typeof custom.message === "string"
	) {
		issueContext.message = custom.message
		issueContext.c = c
		if (custom.expected === undefined) issueContext.description = undefined
		return issueContext
	}
	if (typeof custom.message === "string") {
		issueContext.message = custom.message
		issueContext.c = c
	}
	// what a configured actual says the value was is written after what's
	// expected, as arktype's message is, and after its path as any is
	else if (
		typeof custom.actual === "string" &&
		custom.actual &&
		custom.message === undefined &&
		configured.message === errorWriters.message
	) {
		issueContext.message = errorWriters.message(
			{ expected: issueContext.description, actual: custom.actual } as never,
			locale
		)
	}
	return issueContext
}

export const raisingKeys = { Traversal: {}, FirstIssueTraversal: {} }

// configure()'s writers for each code a callback can raise but predicate, whose text it can't take
export const raisedWritersByCode = (): [
	code: ArkErrorCode,
	writers: Writer[],
	keeps: number
][] => {
	const locale = $ark.cfg!.locale
	const written: [ArkErrorCode, Writer[], number][] = []
	let code: ArkErrorCode
	for (code in errorWritersByCode) {
		if (code === "predicate" || unwritableCodes.has(code)) continue
		const configured: Record<string, unknown> = $ark.cfg![code]
		const defaults: Record<string, unknown> = $ark.defaultConfig[code]
		const isCustom = (k: DescribingKey) => configured[k] !== defaults[k]
		if (!describingKeys.some(isCustom)) continue
		const describer =
			isCustom("actual") ? undefined : (
				describerOf(
					defaults.actual,
					isCustom("message") && typeof configured.message === "function"
				)
			)
		const writerOf = (k: DescribingKey): Writer => {
			if (k === "actual" && describer !== undefined) return describer
			const writer = configured[k]
			if (isCustom(k)) {
				return typeof writer === "function" ?
						new ConfiguredWriter(code, k)
					:	(writer as string)
			}
			// the raised issue's own expected
			if (k === "expected") return
			if (typeof writer !== "function" || runtimeKeyOf(writer))
				return writer as Writer
			if (k === "message") return runtime.writeMessage
			// e.g. a missing key's
			return (writer as Fn)(undefined, { code }, locale) as string
		}
		written.push([
			code,
			describingKeys.map(writerOf),
			// a message configured for a code is its code's, wherever it's raised
			keepsOf(
				isCustom("expected"),
				isCustom("message") ? 2 : undefined,
				!!describer
			)
		])
	}
	return written
}

export const isDescribed = (context: IssueContext): boolean =>
	context.message === undefined && !context.written

// issues hold only code and text, so equal sites share
export const issueSiteOf = (site: FailureSite | UnionSite): object => {
	const { v: value, m: missing } = site as {
		v?: TextContext
		m?: TextContext
	}
	const missingContext = missing && issueContextOf(missing)
	// a key's own text makes its site its own
	const context =
		missingContext && !isDescribed(missingContext) ? missing : (value ?? site)
	const variants = issueSitesByContext.get(context) ?? {}
	issueSitesByContext.set(context, variants)
	const variant = missing ? "required" : "alone"
	if (variants[variant]) return variants[variant]
	const valueContext =
		value ? issueContextOf(value)
		: missing ? undefined
		: issueContextOf({ ...(site as UnionSite), code: "union" })
	return (variants[variant] = issueSite(
		!missingContext ? valueContext!
		: valueContext ? { v: valueContext, m: missingContext }
		: { m: missingContext }
	))
}

const unionContexts = new WeakMap<UnionSite, TextContext>()

// a required key whose union value fails is reported at the key's site, as a basis value is
export const unionKeySiteOf = (
	union: UnionSite,
	missing: TextContext
): object => {
	let value = unionContexts.get(union)
	if (!value) unionContexts.set(union, (value = { ...union, code: "union" }))
	return issueSiteOf({ v: value, m: missing })
}

// runtime keywords with one param never read Traversal
export const isKeyword = (predicate: unknown): boolean =>
	runtimePathsByValue.has(predicate) && (predicate as Fn).length < 2

// a callback that can't reach the Traversal it's passed raises nothing
export const raisesNothing = (predicate: Fn): boolean =>
	isKeyword(predicate) || readsOnlyData.has(predicate)
