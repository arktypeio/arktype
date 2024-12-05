"use client"

import { motion } from "framer-motion"
import React from "react"
import { BoatIcon } from "./icons/boat.jsx"

const BOB_HEIGHT_PX = 2
const BOB_WIDTH_PX = 16

export const FloatYourBoat = () => {
	const [loopDuration, setLoopDuration] = React.useState<number | null>(null)

	const bobFrames = React.useMemo(() => {
		if (!loopDuration) return []
		const frames: number[] = []
		for (let i = 0; i < loopDuration; i++)
			frames.push(i % 2 ? BOB_HEIGHT_PX : 0)
		return frames
	}, [loopDuration])

	React.useLayoutEffect(() => {
		const width = window.innerWidth
		setLoopDuration(width / BOB_WIDTH_PX)
	}, [])

	if (loopDuration === null) return null

	return <Boat loopDuration={loopDuration} bobFrames={bobFrames} />
}

type BoatProps = {
	loopDuration: number
	bobFrames: number[]
}

const Boat = ({ loopDuration, bobFrames }: BoatProps) => (
	<motion.div
		className="absolute z-10 -top-10 pointer-events-none"
		initial={{ left: "-7%" }}
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
		<BoatIcon height={120} />
	</motion.div>
)
