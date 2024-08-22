import { type } from "arktype"

// ParseError:
// Intersection of <= Fri Dec 31 1999 19:00:00 GMT-0500(Eastern Standard Time) and >= Wed Aug 21 2024 20:00:00 GMT-0400(Eastern Daylight Time) results in an unsatisfiable type

const myUser = type({
	birthday: `d'2024-08-22' <= Date <= d'2000-01-01'`
})

const t = type({ string: "number" }).pipe.try
