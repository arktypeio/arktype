"use client"

import { ArrowRightLeftIcon, ExpandIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "./Button.tsx"
import { Playground } from "./playground/Playground.tsx"
import { defaultPlaygroundCode } from "./playground/utils.ts"

export type AutoplayDemoProps = React.DetailedHTMLProps<
	React.VideoHTMLAttributes<HTMLVideoElement>,
	HTMLVideoElement
> & { src: string }

export const MainAutoplayDemo = () => (
	<AutoplayDemo src="https://github.com/user-attachments/assets/eaace5f0-310e-4fc8-9a95-1c0afc6fd110" />
)

export const AutoplayDemo = (props: AutoplayDemoProps) => {
	const [showPlayground, setShowPlayground] = useState(false)
	const [dimensions, setDimensions] = useState({
		width: "100%",
		height: "30vh"
	})
	const videoRef = useRef<HTMLVideoElement>(null)

	useEffect(() => {
		const updateDimensions = () => {
			if (videoRef.current) {
				const { offsetWidth, offsetHeight } = videoRef.current
				setDimensions({
					width: `${offsetWidth}px`,
					height: `${offsetHeight}px`
				})
			}
		}

		if (videoRef.current && videoRef.current.readyState >= 1) updateDimensions()

		const video = videoRef.current
		if (video) {
			video.addEventListener("loadedmetadata", updateDimensions)
			video.addEventListener("loadeddata", updateDimensions)
			window.addEventListener("resize", updateDimensions)
		}

		return () => {
			if (video) {
				video.removeEventListener("loadedmetadata", updateDimensions)
				video.removeEventListener("loadeddata", updateDimensions)
			}
			window.removeEventListener("resize", updateDimensions)
		}
	}, [videoRef.current])

	return (
		<div style={{ position: "relative", width: "100%" }}>
			<div
				style={{
					display: !showPlayground ? "block" : "none",
					width: "100%"
				}}
			>
				<video
					ref={videoRef}
					autoPlay
					loop
					controls={true}
					playsInline
					muted
					disablePictureInPicture={true}
					style={{ width: "100%", display: "block", margin: "0 auto" }}
					{...props}
				/>
			</div>

			<div
				style={{
					display: showPlayground ? "block" : "none",
					height: dimensions.height,
					width: dimensions.width,
					margin: "0 auto"
				}}
			>
				<Playground initialValue={defaultPlaygroundCode} />
			</div>
			<div className="absolute top-2.5 right-5 flex gap-2 z-10">
				<Button
					variant="outline"
					wiggle={!showPlayground}
					onClick={() => setShowPlayground(!showPlayground)}
					aria-label={
						showPlayground ? "Switch to Demo" : "Switch to Playground"
					}
				>
					{showPlayground ?
						<>
							<ArrowRightLeftIcon size={16} />
							<span>Demo Mode</span>
						</>
					:	<>
							<ArrowRightLeftIcon size={16} />
							<span>Playground Mode</span>
						</>
					}
				</Button>

				{showPlayground && (
					<Button
						variant="outline"
						size="sm"
						href="/playground"
						aria-label="Open Full Playground"
					>
						<ExpandIcon size={24} />
					</Button>
				)}
			</div>

			<p className="caption">
				Type-level feedback with each keystroke-{" "}
				<b>no plugins or build steps required</b>.
			</p>
		</div>
	)
}
