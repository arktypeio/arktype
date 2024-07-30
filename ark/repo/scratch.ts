import { type } from "arktype"

const weatherIcons = ["sun", "rain", "snow"] as const

const weatherIcon = type("===", ...weatherIcons)

const t = type({
	icon: ["===", ...weatherIcons]
})
