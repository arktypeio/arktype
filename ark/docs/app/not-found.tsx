import Link from "next/link"
import { NotFoundSearch } from "../components/shell/NotFoundSearch.tsx"
import { TopNav } from "../components/shell/TopNav.tsx"

export const metadata = { title: "Not found" }

export default function NotFound() {
	return (
		<>
			<TopNav />
			<main className="not-found" id="main">
				<p className="nf-label">
					404 <span aria-hidden>//</span> not found
				</p>
				<h1>This page doesn't exist.</h1>
				<p>It may have moved when the docs were reorganized.</p>
				<NotFoundSearch />
				<ul className="nf-links">
					<li>
						<Link href="/docs/intro/your-first-type">Your first type</Link>
					</li>
					<li>
						<Link href="/docs/cheat-sheet">Cheat sheet</Link>
					</li>
					<li>
						<a href="/llms.txt">llms.txt</a>
					</li>
				</ul>
			</main>
		</>
	)
}
