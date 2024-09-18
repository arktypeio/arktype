import { type } from "arktype"

export const disappointingGift = type({
	label: "string",
	"box?": "this"
})

// This is the shape of the data I need. I might use it for other things as well as form input.
const validator = type({
	bool_value: "boolean"
})

// These two preprocessors are just turning what I get from an HTML form checkbox into boolean
const pre_process_1 = type({
	bool_value: type("string='off'").pipe(v => (v === "on" ? true : false))
})

const data = {
	//    bool_value does not exist, so I want it to be false
	// if bool_value='on' then I need  true.  Otherwise false.
}

const preprocess_1_result = pre_process_1(data)
if (preprocess_1_result instanceof type.errors)
	console.log(preprocess_1_result.summary)
else console.log("preprocess 1:", preprocess_1_result)
