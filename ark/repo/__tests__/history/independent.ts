import { attest } from "@ark/attest"
import { scope, type } from "arktype"

it("validates", () => {
	const User = type({
		name: "string",
		age: type("number.integer").narrow(n => n < 150)
	}).pipe(user => ({ ...user, adult: user.age >= 18 }))
	attest(User({ name: "Alan", age: 41 })).snap({
		name: "Alan",
		age: 41,
		adult: true
	})
	attest(User({ name: "Ada", age: 200 }).toString()).snap(
		"age must be valid according to an anonymous predicate (was 200)"
	)
})

it("composes", () => {
	const $ = scope({ id: "string", ids: "id[]" }).export()
	attest($.ids.or("number").expression).snap("number | string[]")
})
