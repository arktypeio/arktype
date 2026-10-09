import { type } from "arktype"

export const After = type("Date >= d'2000-01-01T00:00:00.000Z'")

export const Before = type("Date < d'2000-01-01T05:30:00.000+05:30'")

export const Literal = type(
	"d'1969-12-31T23:59:59.999Z' | d'2000-02-29T00:00:00Z'"
)

export const Epochs = type("Date > 0").and("Date <= 86400000")

export const Stamps = type({
	iso: "string.date.iso",
	"parsed?": "string.date.iso.parse",
	"epoch?": "string.date.epoch.parse",
	"seconds?": "number.epoch"
})
