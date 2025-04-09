import { redirect } from "next/navigation"
import { defineMetadata } from "../metadata.ts"

export const metadata = defineMetadata({
	title: "ArkType Discord",
	ogImage: "ogDiscord.png"
})

export default function DiscordPage() {
	redirect("https://discord.com/invite/xEzdc3fJQC")
}
