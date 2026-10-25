import { attest, contextualize } from "@ark/attest"
import {
	ArkErrors as ArktypeErrors,
	ArkTraversal,
	rootSchema,
	type ArkErrorCode
} from "@ark/schema"
import {
	ArkErrors,
	FirstIssues,
	InternalTraversal,
	mergeIssues,
	type CompactApply,
	type FailureSite
} from "@ark/schema/runtime"

const site = (code: ArkErrorCode, description: string): FailureSite => ({
	v: { code, description }
})

const nameSite: FailureSite = {
	...site("domain", "a string"),
	m: { code: "required" }
}

// { name: string }'s Allows and Apply, as a standalone build compiles them
const userAllows = (data: unknown) =>
	typeof data === "object" &&
	data !== null &&
	typeof (data as { name?: unknown }).name === "string"

const user: CompactApply = (data, ctx) => {
	if (typeof data !== "object" || data === null)
		return !ctx._at(site("domain", "an object"), data)
	if (
		typeof (data as { name?: unknown }).name !== "string" &&
		ctx._at(nameSite, data, "name")
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

	it("pops each key it pushes", () => {
		const users: CompactApply = (data, ctx) => {
			const list = data as unknown[]
			for (let i = 0; i < list.length; i++)
				if (!userAllows(list[i]) && ctx._in(user, list, i)) return false
			return true
		}
		const owner: CompactApply = (data, ctx) =>
			!ctx._in(users, data, "members", { m: { code: "required" } })
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
		errors._at(
			{ code: "discriminant", description: '"a" or "b"' },
			{ kind: "c" },
			"kind"
		)
		attest(errors.issues).snap([
			{
				code: "discriminant",
				path: ["item", "kind"],
				data: "c",
				expected: '"a" or "b"',
				message: 'item.kind must be "a" or "b"'
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
Symbol(s) must be a string`)
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

	it("keeps a supplied message when merging", () => {
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

	it("merges validator issues into arktype errors", () => {
		const errors = new ArktypeErrors(rootSchema("string").$.resolvedConfig)
		const merged = new ArkErrors()
		user({ name: 1 }, merged)
		user({}, merged)
		// as a build writes an undeclared key's site
		merged._at(
			{ v: { code: "undeclared", description: "removed" } },
			{ extra: 1 },
			"extra"
		)
		errors._merge!(merged, ["owner"])
		attest(errors.summary).snap(`owner.name (1) must be...
  ◦ a string
  ◦ is missing
owner.extra must be removed`)
	})

	it("builds arktype's error from a site holding its node's context", () => {
		const n = rootSchema({ domain: "string" }).assertHasKind("domain")
		const ctx = new ArkTraversal(5, n.$.resolvedConfig)
		ctx._at({ v: n.errorContext }, 5)
		attest(String(ctx.finalize())).equals(String(n.traverse(5)))
	})
})
