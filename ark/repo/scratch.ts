// import { scope, type } from "arktype"

// const string = scope({
// 	$root: "string",
// 	somethingElse: "$root[]"
// }).export()

const a = new Date()

a //?

const d = new Date("foo")

d //?

Number.isNaN(d.valueOf()) //?
