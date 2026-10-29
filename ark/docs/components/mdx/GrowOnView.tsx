"use client"

import { useEffect } from "react"
import { reducedMotion } from "../motion.ts"

/**
 * Charts marked `data-grow` that start below the fold grow their bars once
 * they're a third on screen. One already on screen at load, or any under
 * reduced motion, stays as rendered, so nothing already read ever blanks.
 */
export const GrowOnView = () => {
	useEffect(() => {
		if (reducedMotion()) return
		const charts = [...document.querySelectorAll<HTMLElement>("[data-grow]")]
		// every read, then every write, so no write forces a layout for the next read
		const tops = charts.map(chart => chart.getBoundingClientRect().top)
		const observer = new IntersectionObserver(
			entries => {
				for (const { target, intersectionRatio } of entries) {
					if (intersectionRatio < 0.35) continue
					const chart = target as HTMLElement
					chart.dataset.grow = "play"
					observer.unobserve(chart)
				}
			},
			{ threshold: 0.35 }
		)
		for (const [i, chart] of charts.entries()) {
			if (tops[i] < innerHeight) continue
			chart.dataset.grow = "wait"
			observer.observe(chart)
		}
		return () => observer.disconnect()
	}, [])
	return null
}
