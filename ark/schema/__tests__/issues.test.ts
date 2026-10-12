import { attest, contextualize } from "@ark/attest"
import {
	ArkErrors as ArktypeErrors,
	ArkTraversal,
	rootSchema,
	type ArkErrorCode
} from "@ark/schema"
import {
	ArkErrors,
	InternalTraversal,
	mergeIssues,
	type CompactApply,
	type FailureSite
} from "@ark/schema/runtime"

const site = (code: ArkErrorCode, description: string): FailureSite => ({
	value: { code, description }
})

const nameSite: FailureSite = {
	...site("domain", "a string"),
	missing: { code: "required" }
}

// the Allows and Apply of { name: string }, as a standalone build compiles them
const userAllows = (data: unknown) =>
	typeof data === "object" &&
	data !== null &&
	typeof (data as { name?: unknown }).name === "string"

const user: CompactApply = (data, ctx) => {
	if (typeof data !== "object" || data === null)
		return !ctx.failsAt(site("domain", "an object"), data)
	if (
		typeof (data as { name?: unknown }).name !== "string" &&
		ctx.failsAt(nameSite, data, "name")
	)
		return false
	return true
}

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
				message: "name is missing"
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
				message: "name must be a string"
			}
		])
	})

	it("adds an issue at each key it traverses into, leaving the path as it was", () => {
		const users: CompactApply = (data, ctx) => {
			const list = data as unknown[]
			for (let i = 0; i < list.length; i++)
				if (!userAllows(list[i]) && ctx.failsIn(user, list[i], i)) return false
			return true
		}
		const owner: CompactApply = (data, ctx) =>
			!ctx.failsIn(
				users,
				(data as { members?: unknown }).members,
				"members",
				{ missing: { code: "required" } },
				data
			)
		const errors = new ArkErrors()
		owner({ members: [{ name: "a" }, {}, { name: 2 }] }, errors)
		owner({}, errors)
		attest([errors.summary, errors._path]).snap([
			"members[1].name is missing\nmembers[2].name must be a string\nmembers is missing",
			[]
		])
	})

	it("stops at its first issue where its build asks for only that one", () => {
		const errors = new ArkErrors()
		errors.failFast = true
		attest([user({ name: 1 }, errors), errors.count]).equals([false, 1])
	})

	it("names a union's description rather than running its branches", () => {
		const errors = new ArkErrors()
		const branch: CompactApply = () => {
			throw new Error("ran")
		}
		errors.failsUnion([branch], { description: "a string or a number" }, true)
		attest(errors.issues).snap([
			{
				code: "union",
				path: [],
				data: true,
				expected: "a string or a number",
				message: "must be a string or a number"
			}
		])
	})

	it("adds an input's issue at its relative path", () => {
		const errors = new ArkErrors()
		errors.failsWith({ code: "undeclared", data: 1, relativePath: ["extra"] })
		errors.failsWith({
			code: "discriminant",
			data: "c",
			description: '"a" or "b"',
			relativePath: ["kind"]
		})
		attest(errors.summary).snap(`extra must be removed
kind must be "a" or "b"`)
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
Symbol(s) must be a string`)
	})

	it("adds through a traversal the issues it adds to errors alone", () => {
		const errors = new ArkErrors()
		const ctx = new InternalTraversal(undefined, {} as never)
		for (const data of [{ name: 1 }, {}, null]) {
			user(data, errors)
			user(data, ctx)
		}
		attest(ctx._errors!._).equals(errors._)
	})

	it("writes a merged issue's message again at its path, but keeps one supplied", () => {
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
supplied`)
	})

	it("writes the issues arktype's errors merge from a validator's as the validator did", () => {
		const errors = new ArktypeErrors(rootSchema("string").$.resolvedConfig)
		const merged = new ArkErrors()
		user({ name: 1 }, merged)
		user({}, merged)
		merged.failsWith({ code: "undeclared", data: 1, relativePath: ["extra"] })
		errors._merge!(merged, ["owner"])
		attest(errors.summary).snap(`owner.name (1) must be...
  ◦ a string
  ◦ is missing
owner.extra must be removed`)
	})

	it("builds arktype's error from a site holding its node's context", () => {
		const n = rootSchema({ domain: "string" }).assertHasKind("domain")
		const ctx = new ArkTraversal(5, n.$.resolvedConfig)
		ctx.failsAt({ value: n.errorContext }, 5)
		attest(String(ctx.finalize())).equals(String(n.traverse(5)))
	})
})
