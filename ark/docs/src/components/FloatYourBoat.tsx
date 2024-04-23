import { motion } from "framer-motion"
import React, { useEffect } from "react"
import { createRoot } from "react-dom/client"
import BoatSvg from "../assets/boat.svg"

export const FloatYourBoat = () => {
	useEffect(() => {
		const boatContainer = document.createElement("div")
		const BOB_HEIGHT_PX = 2
		const BOB_WIDTH_PX = 16
		const width = window.innerWidth
		const loopDuration = width / BOB_WIDTH_PX
		const bobFrames: number[] = []
		for (let i = 0; i < loopDuration; i++) 
			bobFrames.push(i % 2 ? BOB_HEIGHT_PX : 0)
		
		createRoot(
			document.getElementsByClassName("header")[0].appendChild(boatContainer)
		).render(<Boat loopDuration={loopDuration} bobFrames={bobFrames} />)
		return () => {
			boatContainer.removeChild(boatContainer)
		}
	})
	return null
}

type BoatProps = {
	loopDuration: number
	bobFrames: number[]
}

const Boat = ({ loopDuration, bobFrames }: BoatProps) => (
	<motion.div
		style={{
			position: "fixed",
			top: "-1.2rem",
			// Other navbar items are 12
			zIndex: 11
		}}
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
		<img src={BoatSvg.src} style={{ width: 100 }} />
	</motion.div>
)
