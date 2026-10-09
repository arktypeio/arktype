import { attest, contextualize } from "@ark/attest"
import { writeUnclosedGroupMessage } from "@ark/util"
import type { RegexExecArray } from "arkregex/internal/execArray.ts"
import { type, type Out, type Type } from "arktype"
import { writeUnterminatedEnclosedMessage } from "arktype/internal/parser/shift/operand/enclosed.ts"

contextualize(() => {
	it("with spaces", () => {
		const T = type("'this has spaces'")
		attest<"this has spaces">(T.infer)
		attest(T.json).snap({ unit: "this has spaces" })
	})

	it("with neighbors", () => {
		const T = type("'foo'|/.*/[]")
		attest<"foo" | string[]>(T.infer)
		attest(T.json).snap([
			{ proto: "Array", sequence: { domain: "string", pattern: [".*"] } },
			{ unit: "foo" }
		])
	})

	it("unterminated regex", () => {
		// @ts-expect-error
		attest(() => type("/.*")).throwsAndHasTypeError(
			writeUnterminatedEnclosedMessage(".*", "/")
		)
	})

	it("unterminated single-quote", () => {
		// @ts-expect-error
		attest(() => type("'.*")).throwsAndHasTypeError(
			writeUnterminatedEnclosedMessage(".*", "'")
		)
	})

	it("unterminated double-quote", () => {
		// @ts-expect-error
		attest(() => type('".*')).throwsAndHasTypeError(
			writeUnterminatedEnclosedMessage(".*", '"')
		)
	})

	it("single-quoted", () => {
		const T = type("'hello'")
		attest<"hello">(T.infer)
		attest(T.json).snap({ unit: "hello" })
	})

	it("double-quoted", () => {
		const T = type('"goodbye"')
		attest<"goodbye">(T.infer)
		attest(T.expression).snap('"goodbye"')
	})

	it("regex literal", () => {
		const T = type("/.*/")
		attest<string>(T.infer)
		attest(T.expression).snap("/.*/")
	})

	it("invalid regex", () => {
		// @ts-expect-error
		attest(() => type("/[/"))
			.throws("Invalid regular expression: /[/: Unterminated character class")
			.type.errors(writeUnclosedGroupMessage("]"))
	})

	it("regex exec literal", () => {
		const T = type("x/^a(b)c$/")
		attest<Type<(In: "abc") => Out<RegexExecArray<["abc", "b"], {}, "">>>>(T)
		attest(T.expression).snap(
			"(In: /^a(b)c$/) => Out<{ groups: object | undefined } & string[]>"
		)
		attest(T("abc")).snap(["abc", "b"])
	})

	it("invalid regex exec literal", () => {
		// @ts-expect-error
		attest(() => type("x/[/"))
			.throws("Invalid regular expression: /[/: Unterminated character class")
			.type.errors(writeUnclosedGroupMessage("]"))
	})

	it("nested regex exec literal", () => {
		const User = type({
			// x-prefix a regex literal to parse its type-safe capture groups
			birthday: "x/^(?<month>\\d{2})-(?<day>\\d{2})-(?<year>\\d{4})$/"
		})

		attest<
			Type<{
				birthday: (In: `${number}-${number}-${number}`) => Out<
					RegexExecArray<
						[
							`${number}-${number}-${number}`,
							`${number}`,
							`${number}`,
							`${number}`
						],
						{
							month: `${number}`
							day: `${number}`
							year: `${number}`
						},
						""
					>
				>
			}>
		>(User)

		const data = User.assert({ birthday: "05-21-1993" })

		attest(data.birthday.groups).snap({ month: "05", day: "21", year: "1993" })
	})

	it("mixed quote types", () => {
		const T = type(`"'single-quoted'"`)
		attest<"'single-quoted'">(T.infer)
		attest(T.expression).snap("\"'single-quoted'\"")

		const U = type(`'"double-quoted"'`)
		attest<'"double-quoted"'>(U.infer)
	})

	it("ignores enclosed operators", () => {
		const T = type("'yes|no|maybe'")
		attest<"yes|no|maybe">(T.infer)
		attest(T.expression).snap('"yes|no|maybe"')
	})

	it("mix of enclosed and unenclosed operators", () => {
		const T = type("'yes|no'|'true|false'")
		attest<"yes|no" | "true|false">(T.infer)
		attest(T.expression).snap('"true|false" | "yes|no"')
	})

	it("escaped enclosing", () => {
		const T = type("'don\\'t'")
		attest<"don't">(T.infer)
		attest(T.expression).snap('"don\'t"')
	})

	it("escaped backslash", () => {
		const T = type("'\\\\'")

		const Expected = type.unit("\\")

		attest<typeof Expected.t>(T.t)
		attest(T.expression).equals(Expected.expression)
	})

	it("string literal stress", () => {
		const s = `"3.
14159265358979323846264338327950288419716939937510
58209749445923078164062862089986280348253421170679
82148086513282306647093844609550582231725359408128
48111745028410270193852110555964462294895493038196
44288109756659334461284756482337867831652712019091
45648566923460348610454326648213393607260249141273
72458700660631558817488152092096282925409171536436
78925903600113305305488204665213841469519415116094
33057270365759591953092186117381932611793105118548
07446237996274956735188575272489122793818301194912
98336733624406566430860213949463952247371907021798
60943702770539217176293176752384674818467669405132
00056812714526356082778577134275778960917363717872
14684409012249534301465495853710507922796892589235
42019956112129021960864034418159813629774771309960
51870721134999999837297804995105973173281609631859
50244594553469083026425223082533446850352619311881
71010003137838752886587533208381420617177669147303
59825349042875546873115956286388235378759375195778
185778053217122680661300192"`
		// parses exactly 1001 characters before hitting a recursion limit
		const T = type(s)
		type Expected = typeof s extends `"${infer enclosed}"` ? enclosed : never
		attest<Expected>(T.infer)
	})
})
