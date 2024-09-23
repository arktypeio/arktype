import { type } from "arktype"

export const disappointingGift = type({
	label: "string",
	"box?": "this"
})

type DisappointingGift = typeof disappointingGift.infer

const giftData: DisappointingGift = {
	label: "get hyped"
}

// create a cyclic object
giftData.box = giftData

const ok = disappointingGift.assert(giftData)

const bad = disappointingGift.assert({
	label: "foo",
	box: { label: "bar", box: {} }
})
