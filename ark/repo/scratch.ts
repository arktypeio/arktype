import { regex } from "arktype"

declare const myString: string

const ab = regex("^(a|b)\\1$")

if (ab.test(myString)) {
	console.log(myString)
	//          ^?
}

const capture = ab.exec("aa")?.[1]
//    ^?

capture
