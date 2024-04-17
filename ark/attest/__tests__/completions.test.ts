import { attest } from "@arktype/attest"
import { hasDomain } from "@arktype/util"
import assert from "assert"

type Obj = {
	prop1: string
	prop2: string
	extra: unknown
}
const obj: Obj = { prop1: "", prop2: "", extra: "" }

type Ark = {
	ark: "type"
}

type Arks = {
	ark: "string" | "semver" | "symbol"
}

it("quote types", () => {
	// @ts-expect-error
	attest({ ark: "" } as Ark).completions({ "": ["type"] })
	// prettier-ignore
	// @ts-expect-error
	attest({ ark: "t" } as Ark).completions({ t: ["type"] })
	//@ts-expect-error
	attest({ ark: "ty" } as Ark).completions({ ty: ["type"] })
})

it(".type.completions", () => {
	//@ts-expect-error
	attest({ ark: "s" } as Arks).type.completions({
		s: ["string", "symbol", "semver"]
	})
})

it("keys", () => {
	//@ts-expect-error
	attest({ "": "data" } as Obj).completions({
		"": ["extra", "prop1", "prop2"]
	})
})

it("index access", () => {
	//@ts-expect-error
	attest(() => obj["p"]).type.completions({
		p: ["prop1", "prop2"]
	})
})

it("duplicate string error", () => {
	assert.throws(
		() => attest({ "": "" }).type.completions({}),
		Error,
		"multiple completion candidates"
	)
})

it("empty", () => {
	attest("").completions({})
})

it("external package", () => {
	hasDomain({}, "object")
	// @ts-expect-error
	attest(() => hasDomain({}, "b")).completions
})
