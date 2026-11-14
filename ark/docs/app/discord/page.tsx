import { redirect } from "next/navigation"
import { defineMetadata } from "../metadata.ts"

export const metadata = defineMetadata({
	title: "Discord",
	ogImage: "ogDiscord.png"
})

export default function DiscordPage() {
	redirect("https://discord.com/invite/xEzdc3fJQC")
}
