import BoatSvg from "@site/static/img/boat.svg"
import { motion } from "framer-motion"
import React from "react"

const BOB_HEIGHT_PX = 2
const BOB_WIDTH_PX = 16

export const Boat = () => {
	const width = window.innerWidth
	const loopDuration = width / BOB_WIDTH_PX
	const bobFrames: number[] = []
	for (let i = 0; i < loopDuration; i++) {
		bobFrames.push(i % 2 ? BOB_HEIGHT_PX : 0)
	}
	return (
		<motion.div
			style={{
				position: "absolute",
				bottom: -20,
				opacity: 0.4,
				zIndex: 1
			}}
			initial={{ left: "-5%" }}
			animate={{
				left: "100%",
				y: bobFrames
			}}
			transition={{
				duration: loopDuration,
				repeat: Infinity,
				ease: "linear",
				delay: 1
			}}
		>
			<BoatSvg style={{ width: 100 }} />
		</motion.div>
	)
}
