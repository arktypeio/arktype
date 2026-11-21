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
 * if it was closed, closes it for good on a click of its link or button before
 * hydration, and tracks the pointer over the banner for its hover spotlight.
 * html[data-banner] also shows the button, which can't work without JS.
 */
export const bannerScript = `(function(){try{var b=document.documentElement,k="ark-banner",i=${JSON.stringify(bannerId)};b.dataset.banner=localStorage.getItem(k)===i?"closed":"open";document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest(".banner a,.banner button");if(!t)return;try{localStorage.setItem(k,i)}catch(e){}if(t.localName==="button")b.dataset.banner="closed"});document.addEventListener("pointermove",function(e){if(e.clientY>64)return;var el=e.target.closest&&e.target.closest(".banner");if(!el)return;el.style.setProperty("--mx",e.clientX-el.getBoundingClientRect().left+"px")},{passive:true})}catch(e){}})();`

/** the release announcement above every page's nav */
export const ReleaseBanner = () => (
	<div className="banner">
		<Link href={`/docs/blog/${major}.0`} prefetch={false}>
			<span className="banner-pill">{major}.0</span>
			<span className="banner-text">
				<strong>ArkType {major}.0</strong> is generally available
			</span>
			<span className="banner-sep" aria-hidden>
				·
			</span>
			<span className="banner-cta">
				<span className="banner-cta-label">Read post </span>
				<span className="banner-arrow" aria-hidden>
					→
				</span>
			</span>
		</Link>
		<button type="button" aria-label="Close announcement">
			<XIcon aria-hidden />
		</button>
	</div>
)
