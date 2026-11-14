import type { ReactNode } from "react"
import { HomeNav } from "../../components/home/HomeNav.tsx"
import "../styles/home.css"

// runs before first paint, when motion is welcome: html[data-motion] holds
// what the board and the proof animate at their start, and html[data-ghost]
// hides what the live card ghost-types, so no final state shows and then
// blanks. HomeEffects and LiveType claim them on mount; unclaimed after 3s (a
// slow hydration), they're cleared and everything stays final.
const prepaint = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&!new URLSearchParams(location.search).has("still")){var d=document.documentElement;d.dataset.ghost="";d.dataset.motion="";setTimeout(function(){if(d.dataset.ghost==="")delete d.dataset.ghost;if(d.dataset.motion==="")delete d.dataset.motion},3000)}}catch(e){}`

export default function HomeLayout({ children }: { children: ReactNode }) {
	return (
		<div className="home">
			<script dangerouslySetInnerHTML={{ __html: prepaint }} />
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
