import Link from "next/link"
import { ThemeToggle } from "../shell/ThemeToggle.tsx"
import { SearchPill } from "./SearchPill.tsx"
import { DiscordIcon, GitHubIcon, Logo } from "./icons.tsx"

export const HomeNav = () => (
	<header className="home-nav">
		<div className="wrap">
			<Link className="home-brand" href="/">
				<Logo />
				ArkType
			</Link>
			<nav className="nav-links" aria-label="Primary">
				<Link href="/docs/intro/setup">Docs</Link>
				<Link href="/docs/precompile">Precompile</Link>
				<Link href="/playground">Playground</Link>
				<Link href="/docs/blog">Blog</Link>
				<Link className="nav-sub" href="/docs/regex">
					ArkRegex
				</Link>
				<Link className="nav-sub" href="/docs/attest">
					Attest
				</Link>
			</nav>
			<div className="nav-right">
				<SearchPill />
				<a
					className="icon-btn"
					href="https://github.com/arktypeio/arktype"
					aria-label="GitHub"
				>
					<GitHubIcon />
				</a>
				<a
					className="icon-btn"
					href="https://arktype.io/discord"
					aria-label="Discord"
				>
					<DiscordIcon />
				</a>
				<ThemeToggle className="icon-btn" />
			</div>
		</div>
	</header>
)
