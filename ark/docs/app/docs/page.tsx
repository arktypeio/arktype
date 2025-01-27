import { redirect } from "next/navigation"

export default function RerouteDocsPage() {
	redirect("/docs/intro/setup")
	return null
}
