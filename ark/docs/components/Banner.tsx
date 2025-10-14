"use client"
import { cx } from "class-variance-authority"
import { buttonVariants } from "fumadocs-ui/components/ui/button"
import { X } from "lucide-react"
import Link from "next/link.js"
import {
	type HTMLAttributes,
	type MouseEvent,
	useCallback,
	useEffect,
	useState
} from "react"
import { FloatYourBoat } from "./FloatYourBoat.tsx"

// Based on:
// https://github.com/fuma-nama/fumadocs/blob/1e6ece043987c8bf607249b66a8945632b229982/packages/ui/src/components/banner.tsx#L65

export declare namespace Banner {
	export interface Props extends HTMLAttributes<HTMLDivElement> {
		href: string
		boat?: boolean
		changeLayout?: boolean
	}
}

export const Banner = ({
	id = "banner",
	changeLayout = true,
	boat,
	href,
	children,
	...props
}: Banner.Props): React.ReactElement => {
	const [open, setOpen] = useState(false)
	const globalKey = id ? `nd-banner-${id}` : undefined

	useEffect(() => {
		if (globalKey) setOpen(localStorage.getItem(globalKey) !== "true")
	}, [globalKey])

	const handleCloseClick = useCallback(
		(e: MouseEvent<HTMLButtonElement>) => {
			// prevent the close button click from also triggering the link on
			// the rest the rest of the branner
			e.stopPropagation()
			setOpen(false)
			if (globalKey) localStorage.setItem(globalKey, "true")
		},
		[globalKey]
	)

	const BannerContent = (
		<>
			<div style={{ width: 100 }}>
				{boat ?
					<FloatYourBoat kind="banner" />
				:	null}
			</div>
			<div>{children}</div>
			<div style={{ width: 100 }} />
		</>
	)

	return (
		<div
			id={id}
			{...props}
			className={cx(
				"release-banner",
				"sticky top-0 z-40 flex h-12 flex-row items-center justify-around bg-fd-secondary px-4 text-center text-sm font-medium",
				"bg-fd-background",
				// fix offset scrolling on Chromium-based browsers:
				// https://github.com/arktypeio/arktype/issues/1290
				"!overflow-hidden",
				!open && "hidden",
				props.className
			)}
		>
			{changeLayout && open ?
				<style>{`
        :root:not(.${globalKey ?? "nd-banner-never"}) { --fd-banner-height: 3rem; }
        `}</style>
			:	null}
			{globalKey ?
				<style>{`.${globalKey} #${id} { display: none; }`}</style>
			:	null}
			{id ?
				<script
					dangerouslySetInnerHTML={{
						__html: `if (localStorage.getItem('${globalKey}') === 'true') document.documentElement.classList.add('${globalKey}');`
					}}
				/>
			:	null}
			{background}
			{href ?
				<Link
					href={href}
					className="flex flex-grow items-center justify-around"
					style={{ zIndex: 0 }}
					onClick={() => {
						// remove the banner when someone navigates to the announcement
						if (globalKey) localStorage.setItem(globalKey, "true")
					}}
				>
					{BannerContent}
				</Link>
			:	<div className="flex flex-grow items-center justify-around">
					{BannerContent}
				</div>
			}
			{id ?
				<button
					type="button"
					aria-label="Close Banner"
					onClick={handleCloseClick}
					className={cx(
						buttonVariants({
							color: "ghost",
							className:
								"absolute end-2 top-1/2 -translate-y-1/2 text-fd-muted-foreground z-10",
							size: "icon"
						})
					)}
				>
					<X />
				</button>
			:	null}
		</div>
	)
}

const maskImage =
	"linear-gradient(to bottom,white,transparent), radial-gradient(circle at top center, white, transparent)"

const palette = {
	"--start": "hsla(207, 100%, 9%, 0.35)",
	"--mid": "hsla(207, 100%, 36%, 0.35)",
	"--end": "hsla(207, 100%, 63%, 0.35)",
	"--via": "hsla(207, 100%, 46%, 0.35)"
}

const background = (
	<>
		<div
			className="absolute inset-0 z-[-1]"
			style={{
				maskImage,
				maskComposite: "intersect",
				animation: "fd-moving-banner 16s linear infinite",
				animationDirection: "reverse",
				...palette,
				backgroundImage:
					"repeating-linear-gradient(60deg, var(--start), var(--start) 5%, var(--via) 12%, var(--mid) 20%, var(--end) 28%, transparent 40%)",
				backgroundSize: "200% 100%",
				mixBlendMode: "normal"
			}}
		/>
		<div
			className="absolute inset-0 z-[-1]"
			style={{
				maskImage,
				maskComposite: "intersect",
				animation: "fd-moving-banner 20s linear infinite",
				...palette,
				backgroundImage:
					"repeating-linear-gradient(45deg, var(--start), var(--start) 5%, var(--via) 12%, var(--mid) 20%, var(--end) 28%, transparent 40%)",
				backgroundSize: "200% 100%",
				mixBlendMode: "normal"
			}}
		/>
		<style>
			{`@keyframes fd-moving-banner {
                from { background-position: 0% 0; }
                to { background-position: 100% 0; }
            }`}
		</style>
	</>
)
