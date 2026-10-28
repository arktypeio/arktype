import {
	$ark,
	type ArkErrorCode,
	type BaseNode,
	type BaseRoot,
	type RootUnit
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	errorWriters,
	errorWritersByCode,
	type FailureSite,
	type SiteContext,
	type UnionSite
} from "@ark/schema/internal"
import { type Fn, hasDomain, isDotAccessible, throwParseError } from "@ark/util"
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
const describingKeys = ["expected", "actual", "problem", "message"] as const

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
			if (node.is("union") && node.discriminant) codes.add("discriminant")
			else if (node.is("structure") && node.undeclared === "reject")
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
			// an index signature's keys come from data
			if (
				node.index ||
				node.props.some(
					prop => typeof prop.key === "symbol" || !isDotAccessible(prop.key)
				)
			)
				features.bracketsKeys = true
		} else if (
			node.is("morph") ||
			(node.is("predicate") && !isKeyword(node.predicate))
		) {
			features.reportsIndices = true
			features.bracketsKeys = true
			features.writesText = true
		}
	}
	for (const unit of units) {
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

// a problem, or text written from the program's config, each set by a call on its issue
const writesText = (context: IssueContext | undefined) =>
	context?.problem !== undefined || !!context?.written

// sites only traversal reads, emitted as-is
export const failureSites = new WeakSet<object>()

export const issueSite = <site extends object>(site: site): site => {
	failureSites.add(site)
	return site
}

// a site of a code and description naming nothing the validator receives
export const isInlineSite = (site: object): site is IssueContext =>
	"code" in site &&
	!(site as IssueContext).written &&
	![
		(site as IssueContext).description,
		(site as IssueContext).message,
		(site as IssueContext).problem
	].some(text => text?.match(printedHoleNamePattern))

const siteWords = new Set([
	"runtime",
	"void",
	"siteOf",
	"problemSiteOf",
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
	{ code, description, message, problem }: IssueContext,
	emit: (s: string) => string,
	writer = "siteOf",
	missing?: string
): string => {
	const args =
		writer === "keySiteOf" ?
			[code, description, missing === description ? undefined : missing]
		:	[code, description, message, problem]
	while (args[args.length - 1] === undefined) args.pop()
	return `runtime.${
		writer === "keySiteOf" ? writer
		: args.length > 3 ? "problemSiteOf"
		: "siteOf"
	}(${args.map(arg => (arg === undefined ? "void 0" : emit(arg))).join(", ")})`
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

// what a site's issue reads, with text configured as strings or functions
export interface IssueContext extends SiteContext {
	message?: string
	problem?: string
	written?: {
		context: object
		writers: Writer[]
		// 1 if the issue takes expected, 2 if problem
		keeps: number
	}
}

// arktype writes these from each branch's errors, which issues don't keep
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
		const writerOf = (k: DescribingKey): Writer => {
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
			if (k === "problem") return runtime.writeProblem
			// e.g. a missing key's
			return (writer as Fn)(undefined, context, locale) as string
		}
		issueContext.written = {
			context,
			writers: [
				writerOf("expected"),
				writerOf("actual"),
				writerOf("problem"),
				custom.message === undefined ? undefined : writerOf("message")
			],
			keeps:
				+(custom.expected !== undefined) |
				(+(
					custom.problem !== undefined ||
					(custom.actual !== undefined && custom.message === undefined)
				) <<
					1)
		}
		return issueContext
	}
	if (typeof custom.message === "string") issueContext.message = custom.message
	if (typeof custom.problem === "string") issueContext.problem = custom.problem
	else if (
		typeof custom.actual === "string" &&
		custom.actual &&
		custom.message === undefined &&
		custom.problem === undefined &&
		configured.problem === errorWriters.problem
	) {
		issueContext.problem = errorWriters.problem(
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
		const writerOf = (k: DescribingKey): Writer => {
			const writer = configured[k]
			if (isCustom(k)) {
				return typeof writer === "function" ?
						new ConfiguredWriter(code, k)
					:	(writer as string)
			}
			// the raised issue's own expected, and its message as written without text
			if (k === "expected" || k === "message") return
			if (typeof writer !== "function" || runtimeKeyOf(writer))
				return writer as Writer
			if (k === "problem") return runtime.writeProblem
			// e.g. a missing key's
			return (writer as Fn)(undefined, { code }, locale) as string
		}
		written.push([
			code,
			describingKeys.map(writerOf),
			+isCustom("expected") |
				(+(
					isCustom("problem") ||
					(isCustom("actual") && !isCustom("message"))
				) <<
					1)
		])
	}
	return written
}

export const isDescribed = (context: IssueContext): boolean =>
	context.message === undefined &&
	context.problem === undefined &&
	!context.written

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
