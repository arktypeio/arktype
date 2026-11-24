import Link from "next/link"
import { ThemeToggle } from "../shell/ThemeToggle.tsx"
import { SearchPill } from "./SearchPill.tsx"
import { DiscordIcon, GitHubIcon, Logo, MenuIcon } from "./icons.tsx"

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
				<Link className="nav-quick" href="/docs/intro/setup">
					Docs
				</Link>
				<Link className="nav-quick" href="/playground">
					Playground
				</Link>
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
				<details className="home-menu" data-home-menu>
					<summary className="icon-btn" aria-label="Navigation menu">
						<MenuIcon />
					</summary>
					<nav className="home-menu-panel" aria-label="Mobile navigation">
						<Link href="/docs/intro/setup">Docs</Link>
						<Link href="/docs/precompile">Precompile (@ark/aot)</Link>
						<Link href="/playground">Playground</Link>
						<Link href="/docs/blog">Blog</Link>
						<Link href="/docs/regex">ArkRegex</Link>
						<Link href="/docs/attest">Attest</Link>
					</nav>
				</details>
			</div>
		</div>
	</header>
)
