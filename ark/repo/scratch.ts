import { ArkErrors, type } from "../type/index.js"

interface RuntimeErrors extends ArkErrors {
	/**
```
email must be a palindrome (was "david@arktype.io")
score (133.7) must be...
    • an integer
    • less than 100
```*/
	summary: string
}

const narrowMessage = (e: ArkErrors): e is RuntimeErrors => true

// ---cut---
const palindromicEmail = type("email").narrow((address, ctx) => {
	if (address === [...address].reverse().join("")) {
		// congratulations! your email is somehow a palindrome
		return true
	}
	// add a customizable error and return false
	return ctx.mustBe("a palindrome")
})

const palindromicContact = type({
	email: palindromicEmail,
	score: "integer < 100"
})

const out = palindromicContact({
	email: "david@arktype.io",
	score: 133.7
})

if (out instanceof type.errors) {
	// ---cut-start---
	if (!narrowMessage(out)) throw new Error()
	// ---cut-end---
	console.error(out.summary)
} else {
	console.log(out.email)
}
