import { attest, contextualize } from "@arktype/attest"
import { rawSchema } from "@arktype/schema"
import { ark, type } from "arktype"

contextualize(
	"jsObjects",
	() => {
		it("Function", () => {
			// should not be treated as a morph
			attest<Function>(type("Function").infer)
		})

		it("Date", () => {
			// should not expand built-in classes
			attest(type("Date").infer).type.toString.snap("Date")
		})
	},
	"tsKeywords",
	() => {
		it("string strings", () => {
			/**
			 * 	In honor of @ark-expect-beta aka log(n):
			 * 		- Zirco author https://github.com/zirco-lang/zrc
			 * 		- Shameless Rust stan
			 * 		- Occasional user of ArkType libraries
			 * 		- Frequent user of ArkType Discord
			 * 		- Universally renowned two-finger speed typist
			 */
			const string = type("string")
			attest<string>(string.infer)
			attest(string("string")).snap("string")
		})

		it("any", () => {
			const any = type("any")
			// equivalent to unknown at runtime
			attest(any.json).equals(type("unknown").json)
			// inferred as any
			attest<any>(any.infer)
		})

		it("any in expression", () => {
			const t = type("string&any")
			attest<any>(t.infer)
			attest(t.json).equals(ark.string.json)
		})

		it("boolean", () => {
			const boolean = type("boolean")
			attest<boolean>(boolean.infer)
			const expected = rawSchema([{ unit: false }, { unit: true }])
			// should be simplified to simple checks for true and false literals
			attest(boolean.json).equals(expected.json)
			// TODO:
			// 			attest(boolean.json).snap(`if( $arkRoot !== false && $arkRoot !== true) {
			//     return false
			// }`)
		})

		it("never", () => {
			const never = type("never")
			attest<never>(never.infer)
			const expected = rawSchema([])
			// should be equivalent to a zero-branch union
			attest(never.json).equals(expected.json)
		})

		// TODO: ??
		it("never in union", () => {
			const t = type("string|never")
			attest<string>(t.infer)
			attest(t.json).equals(ark.string.json)
		})

		it("unknown", () => {
			const expected = rawSchema({})
			// should be equivalent to an unconstrained predicate
			attest(type("unknown").json).equals(expected.json)
		})

		it("void", () => {
			const t = type("void")
			attest<void>(t.infer)
			const expected = type("undefined")
			//should be treated as undefined at runtime
			attest(t.json).equals(expected.json)
		})
	}
)

// describe("validation", () => {
// it("integer", () => {
//     const integer = type("integer")
//     attest(integer(123)).equals(123)
//     attest(integer("123").toString()).equals(
//         "must be a number (was string)"
//     )
//     attest(integer(12.12).toString()).equals(
//         "must be an integer (was 12.12)"
//     )
// })
// it("alpha", () => {
//     const alpha = type("alpha")
//     attest(alpha("user")).equals("user")
//     attest(alpha("user123").toString()).equals(
//         "must be only letters (was 'user123')"
//     )
// })
// it("alphanumeric", () => {
//     const alphanumeric = type("alphanumeric")
//     attest(alphanumeric("user123")).equals("user123")
//     attest(alphanumeric("user")).equals("user")
//     attest(alphanumeric("123")).equals("123")
//     attest(alphanumeric("abc@123").toString()).equals(
//         "must be only letters and digits (was 'abc@123')"
//     )
// })
// it("lowercase", () => {
//     const lowercase = type("lowercase")
//     attest(lowercase("var")).equals("var")
//     attest(lowercase("newVar").toString()).equals(
//         "must be only lowercase letters (was 'newVar')"
//     )
// })
// it("uppercase", () => {
//     const uppercase = type("uppercase")
//     attest(uppercase("VAR")).equals("VAR")
//     attest(uppercase("CONST_VAR").toString()).equals(
//         "must be only uppercase letters (was 'CONST_VAR')"
//     )
//     attest(uppercase("myVar").toString()).equals(
//         "must be only uppercase letters (was 'myVar')"
//     )
// })
// it("email", () => {
//     const email = type("email")
//     attest(email("shawn@mail.com")).equals("shawn@mail.com")
//     attest(email("shawn@email").toString()).equals(
//         "must be a valid email (was 'shawn@email')"
//     )
// })
// it("uuid", () => {
//     const uuid = type("uuid")
//     attest(uuid("f70b8242-dd57-4e6b-b0b7-649d997140a0")).equals(
//         "f70b8242-dd57-4e6b-b0b7-649d997140a0"
//     )
//     attest(uuid("1234").toString()).equals(
//         "must be a valid UUID (was '1234')"
//     )
// })
// it("parsedNumber", () => {
//     const parsedNumber = type("parsedNumber")
//     attest(parsedNumber("5")).equals(5)
//     attest(parsedNumber("5.5")).equals(5.5)
//     attest(parsedNumber("five").toString()).equals(
//         "must be a well-formed numeric string (was 'five')"
//     )
// })
// it("parsedInteger", () => {
//     const parsedInteger = type("parsedInteger")
//     attest(parsedInteger("5")).equals(5)
//     attest(parsedInteger("5.5").toString()).equals(
//         "must be a well-formed integer string (was '5.5')"
//     )
//     attest(parsedInteger("five").toString()).equals(
//         "must be a well-formed integer string (was 'five')"
//     )
//     attest(parsedInteger(5).toString()).equals(
//         "must be a string (was number)"
//     )
//     attest(parsedInteger("9007199254740992").toString()).equals(
//         "must be an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER (was '9007199254740992')"
//     )
// })
// it("parsedDate", () => {
//     const parsedDate = type("parsedDate")
//     attest(parsedDate("5/21/1993").out?.toDateString()).equals(
//         "Fri May 21 1993"
//     )
//     attest(parsedDate("foo").toString()).equals(
//         "must be a valid date (was 'foo')"
//     )
//     attest(parsedDate(5).toString()).equals(
//         "must be a string (was number)"
//     )
// })
// it("json", () => {
//     const json = type("json")
//     attest(json('{"a": "hello"}')).equals({ a: "hello" })
//     attest(json(123).toString()).equals(
//         "must be a JSON-parsable string (was number)"
//     )
// })
// it("credit card", () => {
//     const validCC = "5489582921773376"
//     attest(ark.creditCard(validCC)).equals(validCC)
//     // Regex validation
//     attest(ark.creditCard("0".repeat(16)).toString()).equals(
//         "must be a valid credit card number (was '0000000000000000')"
//     )
//     // Luhn validation
//     attest(
//         ark.creditCard(validCC.slice(0, -1) + "0").toString()
//     ).equals(
//         "must be a valid credit card number (was '5489582921773370')"
//     )
// })
// it("semver", () => {
//     attest(ark.semver("1.0.0")).equals("1.0.0")
//     attest(ark.semver("-1.0.0").toString()).equals(
//         "must be a valid semantic version (see https://semver.org/) (was '-1.0.0')"
//     )
// })
// })
