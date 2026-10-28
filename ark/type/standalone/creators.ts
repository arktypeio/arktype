import {
	appliedSignature,
	holdsOnlyMeta,
	introspectionMembers,
	type Baking,
	type failureSources,
	type ValidatorMember,
	type ValidatorReads
} from "./baking.ts"

/** a root apply a creator is passed, with the params it's declared by */
export interface RootApplier {
	params: string
	apply: string
	args: string
	failure?: keyof typeof failureSources
	// reads a name its module declares, so it can't be shared
	local?: boolean
}

export interface CreatorOptions {
	members: ReadonlySet<ValidatorMember>
	ownsValidator: boolean
	applier: RootApplier | undefined
	// whether the creator is passed a make and the parts it creates its root apply from
	makes: boolean
	// whether nothing but the call sets onFail
	unconfigured: boolean
	reads: ValidatorReads
}

// undetailed, a validator pipes its issue only where assert or onFail would end the traversal
export const canPipe = (
	baking: Baking,
	members: ReadonlySet<ValidatorMember>,
	unconfigured: boolean
): boolean => baking.detailsErrors || !unconfigured || members.has("assert")

// a validator nothing passes on as a value is written as what's read of it
export const preciseFormOf = (
	baking: Baking,
	members: ReadonlySet<ValidatorMember>,
	unconfigured: boolean,
	reads: ValidatorReads
): "object" | "apply" | undefined => {
	if (
		members.has("methods") ||
		members.has("~standard") ||
		(reads.piped && canPipe(baking, members, unconfigured))
	)
		return
	if (!reads.called) return "object"
	if (
		unconfigured &&
		!reads.piped &&
		!reads.readsAllows &&
		!members.has("assert") &&
		!members.has("meta") &&
		!introspectionMembers.some(member => members.has(member))
	)
		return "apply"
}

export const frozen = (baking: Baking, expression: string): string =>
	baking.freezes ? `runtime.freeze(${expression})` : expression

// what a creator's source is decided by, beyond its options
interface CreatorForm extends CreatorOptions {
	keepsMeta: boolean
	// a meta reads no onFail a build without config knows it lacks
	configured: boolean
	hasAttributes: boolean
	// where no call passes a traversal, a validator fails only by its onFail
	pipes: boolean
	// what the root apply is passed to fail with
	failing: string | undefined
	// a root apply failing by one onFail, or throwing, is written into the validator
	inlined: string | undefined
	isCalled: boolean
	isApply: boolean
	assertion: string
	allowsOf: string
}

const creatorFormOf = (baking: Baking, opts: CreatorOptions): CreatorForm => {
	const { members, ownsValidator, applier, makes, unconfigured, reads } = opts
	const piped = reads.piped && canPipe(baking, members, unconfigured)
	const failing =
		!piped ? "onFail"
		: baking.detailsErrors ?
			"(pipedFromCtx ? errors => pipedFromCtx.piped(errors) : onFail)"
		:	undefined
	const inlined =
		(
			failing &&
			applier?.apply.startsWith(appliedSignature) &&
			applier.apply.split(/\bonFail\b/).length <= 3
		) ?
			applier.apply
				.slice(appliedSignature.length)
				.replace(/\bonFail\b/, failing)
		:	undefined
	const precise =
		ownsValidator ? undefined : (
			preciseFormOf(baking, members, unconfigured, reads)
		)
	const isCalled = precise !== "object"
	const assertion =
		!isCalled ?
			`data => ${
				inlined ?
					inlined.replace(/\bonFail\b/, "runtime.throwOnDefault")
				:	"rootApply(data, runtime.throwOnDefault)"
			}`
		: piped ?
			"(data, pipedFromCtx) => validator(data, pipedFromCtx, runtime.throwOnDefault)"
		:	"data => validator(data, undefined, runtime.throwOnDefault)"
	return {
		...opts,
		keepsMeta: members.has("meta"),
		configured: !unconfigured,
		hasAttributes:
			members.has("meta") ||
			introspectionMembers.some(member => members.has(member)),
		pipes: piped,
		failing,
		inlined,
		isCalled,
		isApply: precise === "apply",
		assertion,
		allowsOf: frozen(baking, ownsValidator || makes ? "parts[0]" : "allows")
	}
}

// what the creator's validator is: a call, a literal of its members or the root apply itself
const creatorCallOf = (baking: Baking, form: CreatorForm): string => {
	const { members, ownsValidator, applier, makes, reads } = form
	if (ownsValidator)
		return `make(parts${form.configured ? ", configuredOnFail" : ""})`
	if (form.isApply) {
		return (
			applier ? applier.apply
			: makes ? "make(parts)"
			: "rootApply"
		)
	}
	if (!form.isCalled) {
		// an object nothing calls is a literal of its members
		return `{ ${[
			members.has("assert") && `assert: ${frozen(baking, form.assertion)}`,
			form.hasAttributes && (holdsOnlyMeta(members) ? "meta" : "...attributes"),
			reads.readsAllows && `allows: ${form.allowsOf}`
		]
			.filter(member => member)
			.join(", ")} }`
	}
	const signature = `(data, ${form.pipes ? "pipedFromCtx" : "_"}, onFail${form.configured ? " = configuredOnFail" : ""})`
	return (
		form.inlined ? `${signature} => ${form.inlined}`
		: form.failing ? `${signature} => rootApply(data, ${form.failing})`
		: `${signature} => pipedFromCtx ? runtime.pipedIntoUndetailed(pipedFromCtx, rootApply(data, null)) : rootApply(data, onFail)`
	)
}

const creatorBodyOf = (baking: Baking, form: CreatorForm): string => {
	const { members, applier, makes, reads, isCalled } = form
	const metaOf = holdsOnlyMeta(members) ? "meta" : "attributes.meta"
	const standard = frozen(
		baking,
		`{
		vendor: "arktype",
		version: 1,
		validate: ${frozen(baking, "input => runtime.standardResultOf(validator(input))")}${members.has("~standard.jsonSchema") ? `,\n\t\t...attributes["~standard"]` : ""}
	}`
	)
	const call = creatorCallOf(baking, form)
	return [
		form.inlined || form.isApply ? ""
		: applier ? `const rootApply = ${applier.apply}`
		: makes ? "const rootApply = make(parts)"
		: "",
		!form.keepsMeta || !form.configured || !isCalled ? ""
		: baking.readsConfig ?
			`const configuredOnFail = ${metaOf}.onFail ?? runtime.runtimeConfig.onFail`
		:	`const configuredOnFail = ${metaOf}.onFail`,
		`const validator = ${members.has("methods") ? `runtime.setPrototypeOf(${call}, runtime.freeze(runtime.Validator.prototype))` : call}`,
		members.has("assert") && isCalled ?
			`validator.assert = ${frozen(baking, form.assertion)}`
		:	"",
		!form.hasAttributes || !isCalled ? ""
		: holdsOnlyMeta(members) ? "validator.meta = meta"
		: "runtime.assign(validator, attributes)",
		reads.readsAllows && isCalled ? `validator.allows = ${form.allowsOf}` : "",
		members.has("~standard") ?
			`validator["~standard"] = ${
				// a checked build throws reading a JSON Schema it left out, saying how to keep it
				baking.checksTypes && !members.has("~standard.jsonSchema") ?
					`runtime.withoutJsonSchema(${standard})`
				:	standard
			}`
		:	"",
		baking.checksTypes ?
			`return runtime.holdHoles(${frozen(baking, "validator")}, id, holes)`
		:	`return ${frozen(baking, "validator")}`
	]
		.filter(statement => statement)
		.map(statement => `\t${statement}`)
		.join("\n")
}

const creatorParamsOf = (baking: Baking, form: CreatorForm): string[] => {
	const { members, ownsValidator, applier, makes } = form
	return [
		...(ownsValidator || makes ? ["make", "parts"]
		: applier ? [applier.params]
		: ["rootApply", "allows"]),
		...(!form.hasAttributes ? []
		: holdsOnlyMeta(members) ? ["meta = runtime.emptyMeta"]
		: form.keepsMeta ? ["attributes = { meta: runtime.emptyMeta }"]
		: ["attributes"]),
		...(baking.checksTypes ? ["id", "holes = []"] : []),
		...(!form.configured || form.keepsMeta ? []
		: baking.readsConfig ? ["configuredOnFail = runtime.runtimeConfig.onFail"]
		: ["configuredOnFail"])
	]
}

/** the params and body of the function creating a validator from its root apply */
export const creatorSourceOf = (
	baking: Baking,
	opts: CreatorOptions
): [params: string, body: string] => {
	const form = creatorFormOf(baking, opts)
	return [creatorParamsOf(baking, form).join(", "), creatorBodyOf(baking, form)]
}
