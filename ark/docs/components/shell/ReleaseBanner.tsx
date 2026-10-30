import { XIcon } from "lucide-react"
import Link from "next/link"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { repoArkDir } from "../../lib/content/paths.ts"

const { version }: { version: string } = JSON.parse(
	readFileSync(join(repoArkDir, "type", "package.json"), "utf8")
)

const major = version.split(".")[0]

/** a new id shows the banner again to visitors who closed an earlier one */
const bannerId = `arktype-${major}`

/**
 * Runs in the head before first paint (see app/layout.tsx): hides the banner
 * if it was closed, and closes it for good on a click of its link or button,
 * before hydration too. html[data-banner] also shows the button, which can't
 * work without JS.
 */
export const bannerScript = `(function(){try{var b=document.documentElement,k="ark-banner",i=${JSON.stringify(bannerId)};b.dataset.banner=localStorage.getItem(k)===i?"closed":"open";document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest(".banner a,.banner button");if(!t)return;try{localStorage.setItem(k,i)}catch(e){}if(t.localName==="button")b.dataset.banner="closed"})}catch(e){}})();`

/** the release announcement above every page's nav */
export const ReleaseBanner = () => (
	<div className="banner">
		<Link href={`/docs/blog/${major}.0`} prefetch={false}>
			🎉 Introducing ArkType {major} 🎉
		</Link>
		<button type="button" aria-label="Close announcement">
			<XIcon aria-hidden />
		</button>
	</div>
)
