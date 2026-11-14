import type { MetadataRoute } from "next"
import { siteUrl } from "./metadata.ts"

export const dynamic = "force-static"

export default (): MetadataRoute.Robots => ({
	rules: { userAgent: "*", allow: "/" },
	sitemap: `${siteUrl}/sitemap.xml`
})
