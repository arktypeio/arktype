"use client"

import { useEffect, useRef } from "react"
import { BoatIcon } from "../icons/boat.tsx"

/** seconds the boat takes to cross, as in boat-float */
const crossing = 150

/**
 * The boat drifting along the bottom edge of the lane. Its place in the
 * crossing comes from the clock, so a new page doesn't send it back to the
 * start. It fades in once placed and only moves while on screen.
 */
export const BoatLane = ({ className }: { className?: string }) => {
	const ref = useRef<HTMLDivElement>(null)
	useEffect(() => {
		const lane = ref.current!
		lane.style.setProperty("--boat-at", `${-((Date.now() / 1000) % crossing)}s`)
		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) lane.dataset.on = ""
			else delete lane.dataset.on
		})
		observer.observe(lane)
		return () => observer.disconnect()
	}, [])
	return (
		<div
			ref={ref}
			className={className ? `boat-lane ${className}` : "boat-lane"}
			aria-hidden
		>
			<span className="boat">
				<BoatIcon />
			</span>
		</div>
	)
}
