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

/** how a validator is written: what's read of it, and what it's created from */
export interface ValidatorForm {
	members: ReadonlySet<ValidatorMember>
	reads: ValidatorReads
	// written without holes; each factory call rekeys it
	isTemplate: boolean
	// unless shortest, the build writes the validator itself
	ownsValidator: boolean
	// only a config or meta sets the onFail a validator is created with
	unconfigured: boolean
	// whether the validator can be piped into, so its apply takes a traversal
	pipes: boolean
	// created by runtime.createValidator rather than a creator of its own
	byRuntime: boolean
}

/** what a validator is created with besides its root apply */
export interface ValidatorAttributes {
	id: string
	// the holes it's keyed by, where it isn't a template
	held: string | undefined
	meta: string | undefined
	attributes: string[]
	// without its meta, a validator still fails as the meta's onFail does
	onFail: string | undefined
}

// a creator per applier: V8 can't inline a shared root apply's Allows call
export const fusedApplierOf = (
	baking: Baking,
	form: ValidatorForm,
	applied: string | RootApplier
): RootApplier | undefined => {
	const { members, reads, ownsValidator, unconfigured } = form
	if (typeof applied !== "object" || form.isTemplate || form.byRuntime) return
	const fuses =
		/^(?:\[|{ 0: )?allows\b/.test(applied.params) ?
			baking.shortest || (!ownsValidator && !applied.local)
			// a validator written as what's read of it reads no other Allows
		:	!applied.local &&
			!reads.readsAllows &&
			preciseFormOf(baking, members, unconfigured, reads) !== undefined
	if (!fuses) return
	// read only for allows, a validator is created from its Allows, dropping its Apply
	return (
			applied.params === "allows, apply" &&
				!members.has("assert") &&
				preciseFormOf(baking, members, unconfigured, reads) === "object"
		) ?
			{
				...applied,
				params: "allows",
				args: applied.args.slice(0, applied.args.indexOf(","))
			}
		:	applied
}

// a validator created from its parts, the first of which is its Allows
export const madeApplierOf = (
	form: ValidatorForm,
	applied: string | RootApplier,
	allows: string
): RootApplier | undefined =>
	(
		!form.ownsValidator &&
		!form.isTemplate &&
		typeof applied === "object" &&
		allows === `${applied.args}[0]` &&
		!form.byRuntime
	) ?
		applied
	:	undefined

// the attributes a validator is created with, as its creator takes them
export const writtenAttributesOf = (
	baking: Baking,
	form: ValidatorForm,
	attributes: string[],
	meta: string | undefined,
	onFail: string | undefined
): string[] =>
	// a creator defaults an empty-meta validator's attributes, so a site needs only imports
	(
		!form.isTemplate &&
		!baking.checksTypes &&
		!onFail &&
		!form.byRuntime &&
		attributes.length === 1 &&
		attributes[0] === "meta: runtime.emptyMeta"
	) ?
		[]
	: !form.isTemplate && !form.byRuntime && holdsOnlyMeta(form.members) ? [meta!]
	: attributes.length ? [`{ ${attributes.join(", ")} }`]
	: []

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

// what a creator's source is decided by, beyond the validator's form
interface CreatorForm extends ValidatorForm {
	applier: RootApplier | undefined
	// whether the creator is passed a make and the parts it creates its root apply from
	makes: boolean
	keepsMeta: boolean
	// a meta reads no onFail a build without config knows it lacks
	configured: boolean
	hasAttributes: boolean
	// where no call passes a traversal, a validator fails only by its onFail
	piped: boolean
	// what the root apply is passed to fail with
	failing: string | undefined
	// a root apply failing by one onFail, or throwing, is written into the validator
	inlined: string | undefined
	isCalled: boolean
	isApply: boolean
	assertion: string
	allowsOf: string
}

const creatorFormOf = (
	baking: Baking,
	form: ValidatorForm,
	applier: RootApplier | undefined,
	makes: boolean
): CreatorForm => {
	const { members, ownsValidator, unconfigured, reads } = form
	const piped = reads.piped && form.pipes
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
		...form,
		applier,
		makes,
		keepsMeta: members.has("meta"),
		configured: !unconfigured,
		hasAttributes:
			members.has("meta") ||
			introspectionMembers.some(member => members.has(member)),
		piped,
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
	const signature = `(data, ${form.piped ? "pipedFromCtx" : "_"}, onFail${form.configured ? " = configuredOnFail" : ""})`
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
		validate: ${frozen(baking, "input => runtime.standardResultOf(validator(input))")},
		${members.has("~standard.jsonSchema") ? `...attributes["~standard"]` : `get jsonSchema() { return runtime.lacks("~standard.jsonSchema") }`}
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
		: "runtime.own(validator, attributes)",
		reads.readsAllows && isCalled ? `validator.allows = ${form.allowsOf}` : "",
		members.has("~standard") ? `validator["~standard"] = ${standard}` : "",
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
	form: ValidatorForm,
	applier: RootApplier | undefined,
	makes: boolean
): [params: string, body: string] => {
	const creator = creatorFormOf(baking, form, applier, makes)
	return [
		creatorParamsOf(baking, creator).join(", "),
		creatorBodyOf(baking, creator)
	]
}
