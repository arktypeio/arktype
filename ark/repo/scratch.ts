import { type, type ArkErrors } from "arktype"

interface RuntimeErrors extends ArkErrors {
	/**name must be a string (was true) 
version must be a valid semantic version (see https://semver.org/) (was "v2.0.0")*/
	summary: string
}

const narrowMessage = (e: ArkErrors): e is RuntimeErrors => true

// ---cut---
// .to is a sugared .pipe for a single parsed output validator
const parseJson = type("parse.json").to({
	name: "string",
	version: "semver"
})

const out = parseJson('{ "name": true, "version": "v2.0.0" }')

if (out instanceof type.errors) {
	// ---cut-start---
	// just a trick to display the runtime error
	if (!narrowMessage(out)) throw new Error()
	// ---cut-end---
	// hover out.summary to see the default error message
	console.error(out.summary)
}
