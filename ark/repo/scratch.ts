import { type } from "arktype"

const out = type("string.lower").to("string.trim").to("'success'")("Success") //?

const tt = type("string.lower").to("string.trim").to("'success'")

console.log(tt.json)

const out2 = "success " //?
