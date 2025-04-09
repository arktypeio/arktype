import { useCallback } from "react"
import { defineMetadata } from "../metadata.ts"

export const metadata = defineMetadata({
	title: "ArkType Discord",
	ogImage: "ogDiscord.png"
})

export default () => {
	useCallback(() => {
		window.location.href = "https://discord.com/invite/xEzdc3fJQC"
	}, [])

	return null
}
