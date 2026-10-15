import type { ReactNode } from "react"
import { HomeNav } from "../../components/home/HomeNav.tsx"

// runs before first paint: when the live card will ghost-type its definition,
// html[data-ghost] hides what it animates, so the final line never shows and
// then blanks. LiveType claims it on mount; unclaimed after 3s (a slow
// hydration), it's cleared and the card stays final.
const ghostPrepaint = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&!new URLSearchParams(location.search).has("still")){var d=document.documentElement;d.dataset.ghost="";setTimeout(function(){if(d.dataset.ghost==="")delete d.dataset.ghost},3000)}}catch(e){}`

export default function HomeLayout({ children }: { children: ReactNode }) {
	return (
		<div className="home">
			<script dangerouslySetInnerHTML={{ __html: ghostPrepaint }} />
			<div hidden data-nosnippet>
				Reading this as an agent? Every docs page is Markdown: add .md to its
				URL. Index: https://arktype.io/llms.txt. Skill: npx skills add
				arktypeio/arktype
			</div>
			<HomeNav />
			<main id="main">{children}</main>
		</div>
	)
}
