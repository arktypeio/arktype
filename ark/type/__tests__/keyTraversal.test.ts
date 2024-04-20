// TODO: reenable
// describe("key traversal", () => {
// 	const getExtraneousB = () => ({ a: "ok", b: "why?" })
// 	it("loose by default", () => {
// 		const t = type({
// 			a: "string"
// 		})
// 		const dataWithExtraneousB = getExtraneousB()
// 		attest(t(dataWithExtraneousB)).equals(dataWithExtraneousB)
// 	})
//
// 	it("invalid union", () => {
// 		const o = type([{ a: "string" }, "|", { b: "boolean" }]).configure({
// 			keys: "strict"
// 		})
// 		attest(o({ a: 2 }).toString()).snap(
// 			'a must be a string or removed (was {"a":2})'
// 		)
// 	})
//
// 	it("distilled type", () => {
// 		const t = type({
// 			a: "string"
// 		}).configure({ keys: "distilled" })
// 		attest(t({ a: "ok" })).equals({ a: "ok" })
// 		attest(t(getExtraneousB())).snap({ a: "ok" })
// 	})
//
// 	it("distilled array", () => {
// 		const o = type({ a: "email[]" }).configure({
// 			keys: "distilled"
// 		})
// 		attest(o({ a: ["shawn@arktype.io"] })).snap({
// 			a: ["shawn@arktype.io"]
// 		})
// 		attest(o({ a: ["notAnEmail"] }).toString()).snap(
// 			"a/0 must be a valid email (was 'notAnEmail')"
// 		)
// 		// can handle missing keys
// 		attest(o({ b: ["shawn"] }).toString()).snap("a must be defined")
// 	})
//
// 	it("distilled union", () => {
// 		const o = type([{ a: "string" }, "|", { b: "boolean" }]).configure({
// 			keys: "distilled"
// 		})
// 		// can distill to first branch
// 		attest(o({ a: "to", z: "bra" })).snap({ a: "to" })
// 		// can distill to second branch
// 		attest(o({ b: true, c: false })).snap({ b: true })
// 		// can handle missing keys
// 		attest(o({ a: 2 }).toString()).snap(
// 			'a must be a string or b must be defined (was {"a":2})'
// 		)
// 	})
//
// 	it("strict type", () => {
// 		const t = type({
// 			a: "string"
// 		}).configure({ keys: "strict" })
// 		attest(t({ a: "ok" })).equals({ a: "ok" })
// 		attest(t(getExtraneousB()).toString()).snap("b must be removed")
// 	})
//
// 	it("strict array", () => {
// 		const o = type({ a: "string[]" }).configure({
// 			keys: "strict"
// 		})
// 		attest(o({ a: ["shawn"] })).snap({ a: ["shawn"] })
// 		attest(o({ a: [2] }).toString()).snap(
// 			"a/0 must be a string (was number)"
// 		)
// 		attest(o({ b: ["shawn"] }).toString()).snap(
// 			"b must be removed\na must be defined"
// 		)
// 	})
// })
