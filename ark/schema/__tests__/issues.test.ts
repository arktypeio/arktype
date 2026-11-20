import { attest, contextualize } from "@ark/attest"
import {
	ArkErrors as ArktypeErrors,
	ArkTraversal,
	rootSchema,
	type ArkErrorCode
} from "@ark/schema"
import { UndetailedErrors } from "@ark/schema/errors"
import { ArkErrors as LeanErrors } from "@ark/schema/internal/shared/issuesLean.ts"
import {
	ArkErrors,
	codedIssue,
	failsKey,
	failsKeySite,
	FirstIssues,
	InternalTraversal,
	mergeIssues,
	sharedMessageOf,
	type CompactApply,
	type FailureContext,
	type FailureSite
} from "@ark/schema/runtime"
import { stringifyPath } from "@ark/util"

// a key's site held as an object: its value's context, and the missing
// key's, which expects nothing
const nameSite: FailureSite = {
	v: { code: "domain", description: "a string" },
	m: { code: "required" }
}

// { name: string }'s Allows and Apply, as a standalone build compiles them
const userAllows = (data: unknown) =>
	typeof data === "object" &&
	data !== null &&
	typeof (data as { name?: unknown }).name === "string"

const user: CompactApply = (data, ctx) => {
	if (typeof data !== "object" || data === null)
		return !ctx._e(data, "domain", "an object")
	if (
		typeof (data as { name?: unknown }).name !== "string" &&
		failsKeySite(ctx, nameSite, data, "name")
	)
		return false
	return true
}

// a context failed at a key, as a build writes one that's no key's own site
const failsUnder = (
	ctx: FailureContext,
	data: unknown,
	key: PropertyKey,
	code: ArkErrorCode,
	expected: string,
	message?: string
) => ctx._k((value, ctx) => !ctx._e(value, code, expected, message), data, key)

const issuesOf = (data: unknown) => {
	const errors = new ArkErrors()
	user(data, errors)
	return errors.issues
}

contextualize(() => {
	it("reports a missing key as required, with the object missing it", () => {
		attest(issuesOf({})).snap([
			{
				code: "required",
				path: ["name"],
				data: {},
				expected: undefined,
				message: "is missing"
			}
		])
	})

	it("reports a present key's value at its path", () => {
		attest(issuesOf({ name: 1 })).snap([
			{
				code: "domain",
				path: ["name"],
				data: 1,
				expected: "a string",
				message: "must be a string"
			}
		])
	})

	it("reports a key holding undefined as its value, not as missing", () => {
		// passed what a missing key says, even where that's nothing
		const owner: CompactApply = (data, ctx) =>
			!ctx._k(user, data, "owner", undefined)
		const errors = new ArkErrors()
		user({ name: undefined }, errors)
		owner({ owner: undefined }, errors)
		attest(errors.summary).equals(
			"name must be a string\nowner must be an object"
		)
	})

	it("applies a key's value, one that's undefined too, and fails a missing key only where it's passed what one says", () => {
		const applied: unknown[] = []
		const applies: CompactApply = value => (applied.push(value), true)
		const errors = new ArkErrors()
		const ctx = new InternalTraversal(undefined, {} as never)
		for (const reported of [errors, ctx]) {
			reported._k(applies, { a: 1 }, "a", "a string")
			reported._k(applies, { a: undefined }, "a", "a string")
			reported._k(applies, {}, "a", "a string", "Enter a.")
			// an optional key is passed nothing, so its value is applied
			reported._k(applies, {}, "a")
		}
		attest(applied).equals([1, undefined, undefined, 1, undefined, undefined])
		attest(ctx._errors!._).equals(errors._)
		attest(errors.issues).snap([
			{
				code: "required",
				path: ["a"],
				data: {},
				expected: "a string",
				message: "Enter a."
			}
		])
	})

	it("fails a key with what its value expects where it's missing, unless passed what a missing key does", () => {
		const errors = new ArkErrors()
		failsKey(errors, {}, "a", "domain", "a string")
		failsKey(errors, {}, "b", "domain", "a string", "a string or a number")
		failsKey(errors, { c: 1 }, "c", "domain", "a string")
		attest(errors.summary).snap(`a must be a string (was missing)
b must be a string or a number (was missing)
c must be a string`)
	})

	it("pops each key it pushes", () => {
		const users: CompactApply = (data, ctx) => {
			const list = data as unknown[]
			for (let i = 0; i < list.length; i++)
				if (!userAllows(list[i]) && ctx._k(user, list, i)) return false
			return true
		}
		const owner: CompactApply = (data, ctx) =>
			!ctx._k(users, data, "members", undefined)
		const errors = new ArkErrors()
		owner({ members: [{ name: "a" }, {}, { name: 2 }] }, errors)
		owner({}, errors)
		attest([errors.summary, errors._p]).snap([
			"members[1].name is missing\nmembers[2].name must be a string\nmembers is missing",
			[]
		])
	})

	it("first stops at one issue", () => {
		const errors = new FirstIssues()
		attest([user({ name: 1 }, errors), errors.count]).equals([false, 1])
	})

	it("first enumerates as all does", () => {
		attest(Object.keys(new FirstIssues())).equals(Object.keys(new ArkErrors()))
	})

	it("adds a discriminant's issue at the key it reads", () => {
		const errors = new ArkErrors()
		errors._p.push("item")
		failsUnder(errors, { kind: "c" }, "kind", "discriminant", '"a" or "b"')
		attest(errors.issues).snap([
			{
				code: "discriminant",
				path: ["item", "kind"],
				data: "c",
				expected: '"a" or "b"',
				message: 'must be "a" or "b"'
			}
		])
	})

	it("writes a path's keys apart with dots, and its indices in brackets", () => {
		const errors = new ArkErrors()
		const at = (...path: PropertyKey[]) =>
			errors._.push({ code: "domain", path, data: 1, expected: "a string" })
		at()
		at(0)
		at("a", 0, "b")
		at(Symbol("s"))
		attest(errors.summary).snap(`must be a string
[0] must be a string
a[0].b must be a string
[Symbol(s)] must be a string`)
	})

	it("prints a number in a path as arktype's own errors do", () => {
		const path = [0, -1, 1.5, 1e21, NaN, Infinity, -Infinity]
		const printed = "[0][-1][1.5][1e+21][NaN][Infinity][-Infinity]"
		attest(stringifyPath(path)).equals(printed)
		for (const Errors of [ArkErrors, LeanErrors]) {
			const errors = new Errors()
			errors._.push({ code: "domain", path, data: 1, expected: "a string" })
			attest(errors.summary).equals(`${printed} must be a string`)
		}
	})

	it("adds through a traversal as through errors", () => {
		const errors = new ArkErrors()
		const ctx = new InternalTraversal(undefined, {} as never)
		for (const data of [{ name: 1 }, {}, null]) {
			user(data, errors)
			user(data, ctx)
		}
		attest(ctx._errors!._).equals(errors._)
	})

	it("keeps a supplied message when merging, set apart from its path", () => {
		const inner = new ArkErrors()
		user({}, inner)
		inner._.push({
			code: "predicate",
			path: [],
			data: 1,
			expected: undefined,
			message: "supplied"
		})
		// read before it's merged
		attest(inner.summary).snap(`name is missing
supplied`)
		const outer = new ArkErrors()
		mergeIssues(outer, inner, ["owner"])
		attest(outer.summary).snap(`owner.name is missing
owner: supplied`)
		attest(outer.issues.map(issue => issue.message)).equals([
			"is missing",
			"supplied"
		])
	})

	it("sets a site's message apart from its path unless it begins as what's written from what it expects", () => {
		const messages = [
			// a sentence of its own
			"Enter a name.",
			// configured as the text arktype writes, which reads on from its path
			"must be a string",
			// and with more after it, as what the value was
			"must be a string (was 1)",
			// what's expected alone isn't how arktype's begins
			"a string"
		]
		for (const Errors of [ArkErrors, LeanErrors]) {
			const errors = new Errors()
			for (const x of messages)
				failsUnder(errors, { k: 1 }, "k", "domain", "a string", x)
			attest(errors.summary).equals(`k: Enter a name.
k must be a string
k must be a string (was 1)
k: a string`)
			// each is its issue's message as it was configured
			attest(errors.issues.map(issue => issue.message)).equals(messages)
		}
	})

	it("shares a sentence each issue says unless one's is its code's, which a copy stays", () => {
		const said = (x: string, text?: FailureSite["text"]) => {
			const errors = new ArkErrors()
			errors._e(1, "domain", "a string", x, text)
			return errors
		}
		const own = said("Same")._[0]
		const coded = said("Same", codedIssue)._[0]
		attest(sharedMessageOf([own, own])).equals("Same")
		attest(sharedMessageOf([own, coded])).equals(undefined)
		// noted where an issue's readers don't see it
		attest(coded).equals(own)
		const moved = new ArkErrors()
		mergeIssues(moved, said("Same", codedIssue), ["k"])
		attest(sharedMessageOf(moved._)).equals(undefined)
		mergeIssues(moved, said("Same"), ["k"])
		attest(sharedMessageOf(moved._.slice(1))).equals("Same")
		// one that begins as what's written from what it expects is listed
		const written = said("must be a string")._[0]
		attest(sharedMessageOf([written, written])).equals(undefined)
	})

	it("merges validator issues into arktype errors", () => {
		const errors = new ArktypeErrors(rootSchema("string").$.cfg)
		const merged = new ArkErrors()
		user({ name: 1 }, merged)
		user({}, merged)
		// as a build writes an undeclared key's site
		failsUnder(merged, { extra: 1 }, "extra", "undeclared", "removed")
		errors._merge!(merged, ["owner"])
		attest(errors.summary).snap(`owner.name must be a string
owner.name is missing
owner.extra must be removed`)
	})

	it("builds arktype's error from a site holding its node's context", () => {
		const n = rootSchema({ domain: "string" }).assertIs("domain")
		const ctx = new ArkTraversal(5, n.$.cfg)
		ctx._at({ v: n.errorCtx }, 5)
		attest(String(ctx.fin())).equals(String(n.traverse(5)))
	})

	it("preserves subclass instanceof and _merge for runtime errors", () => {
		class SubErrors extends ArktypeErrors {}
		const cfg = rootSchema("string").$.cfg
		const sub = new SubErrors(cfg)
		const full = rootSchema("string")(1) as ArktypeErrors
		const runtimeErr = new ArkErrors()
		runtimeErr._e(1, "domain", "a string")
		const undetailed = new UndetailedErrors(cfg)

		attest(sub instanceof SubErrors).equals(true)
		attest(sub instanceof ArktypeErrors).equals(true)
		attest(full instanceof SubErrors).equals(false)
		attest(runtimeErr instanceof SubErrors).equals(false)
		attest(undetailed instanceof UndetailedErrors).equals(true)
		attest(undetailed instanceof ArktypeErrors).equals(true)
		attest(full instanceof UndetailedErrors).equals(false)
		attest(runtimeErr instanceof UndetailedErrors).equals(false)

		const target = new ArktypeErrors(cfg)
		target._merge(runtimeErr, ["field"])
		attest(target.summary).snap("field must be a string")
	})
})
