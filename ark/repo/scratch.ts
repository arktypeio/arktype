import { type } from "arktype"

const oneTo9999 = type("1 <= number.integer <= 9999")

const T = type({
	PORT: ["string.integer.parse", "=>", oneTo9999]
})
const defaults: typeof T.infer = {
	PORT: 123
}

process.env.PORT = "456"

const out = T.assert(process.env)

console.log(out.PORT)

declare global {
	interface ArkEnv {
		meta(): {
			text: string
			url: string
		}
	}
}

export const _assetOptionsSchema = type({
	"assetType?": type("string").default("image").configure({
		text: "Uses Generative Fill to extended padded image with AI",
		url: "https://cloudinary.com/documentation/transformation_reference#g_gravity"
	})
})
