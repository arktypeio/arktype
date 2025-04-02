"use client"

import { CodeIcon, ExpandIcon, Undo2Icon } from "lucide-react"
import Link from "next/link.js"
import { posthog } from "posthog-js"
import { useEffect, useRef, useState } from "react"
import { Playground } from "./Playground.tsx"

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
	const [resetTrigger, setResetTrigger] = useState(0)
	const videoRef = useRef<HTMLVideoElement>(null)

	// Get video dimensions on load
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

		// Initial check
		if (videoRef.current && videoRef.current.readyState >= 1) updateDimensions()

		// Set up event listeners
		const video = videoRef.current
		if (video) {
			video.addEventListener("loadedmetadata", updateDimensions)
			video.addEventListener("loadeddata", updateDimensions)
			window.addEventListener("resize", updateDimensions)
		}

		// Clean up
		return () => {
			if (video) {
				video.removeEventListener("loadedmetadata", updateDimensions)
				video.removeEventListener("loadeddata", updateDimensions)
			}
			window.removeEventListener("resize", updateDimensions)
		}
	}, [videoRef.current])

	const togglePlayground = () => {
		if (showPlayground) setResetTrigger(prev => prev + 1)
		else {
			posthog.capture("Playground mode", {
				location: window.location.href
			})
		}
		setShowPlayground(!showPlayground)
	}

	return (
		<div style={{ position: "relative", width: "100%" }}>
			{/* Always render both video and playground, controlling visibility with CSS */}
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
				<Playground visible={showPlayground} resetTrigger={resetTrigger} />
			</div>

			<div className="button-group">
				<button
					onClick={togglePlayground}
					className={`toggle-playground-button ${showPlayground ? "" : "video-mode"}`}
					aria-label={
						showPlayground ? "Switch to Demo" : "Switch to Playground"
					}
				>
					{showPlayground ?
						<>
							<Undo2Icon size={16} />
							<span>Demo Mode</span>
						</>
					:	<>
							<CodeIcon size={16} />
							<span>Playground Mode</span>
						</>
					}
				</button>

				{showPlayground && (
					<Link
						href="/playground"
						className="toggle-playground-button"
						aria-label="Open Full Playground"
					>
						<ExpandIcon size={32} style={{ marginTop: "4px" }} />
					</Link>
				)}
			</div>

			{/* Added margin-top to ensure proper spacing below video/playground */}
			<p className="caption">
				Type-level feedback with each keystroke-{" "}
				<b>no plugins or build steps required</b>.
			</p>

			<style jsx>{`
				.button-group {
					position: absolute;
					top: 10px;
					right: 20px;
					display: flex;
					gap: 8px;
					z-index: 10;
				}

				/* Move existing .toggle-playground-button styles here but remove positioning */
				.toggle-playground-button {
					display: flex;
					align-items: center;
					gap: 6px;
					padding: 8px 12px;
					background: transparent;
					color: #fff;
					border: 2px solid rgba(255, 255, 255, 0.6); /* Slightly reduced border brightness */
					border-radius: 1rem;
					font-size: 14px;
					font-weight: 600;
					cursor: pointer;
					backdrop-filter: blur(5px);
					box-shadow:
						0 0 7px rgba(255, 255, 255, 0.5),
						/* Reduced by ~30% */ 0 0 14px rgba(149, 88, 248, 0.3),
						/* Reduced by ~30% */ inset 0 0 6px rgba(255, 255, 255, 0.15); /* Reduced by ~30% */
					text-shadow: 0 0 6px rgba(255, 255, 255, 0.6); /* Reduced by ~30% */
					transition: all 0.15s ease; /* Faster hover response */
					animation: pulse 8s ease-in-out infinite;
				}

				/* Reduced intensity pulse animation */
				@keyframes pulse {
					0%,
					100% {
						box-shadow:
							0 0 7px rgba(255, 255, 255, 0.4),
							0 0 10px rgba(149, 88, 248, 0.2),
							inset 0 0 6px rgba(255, 255, 255, 0.15);
					}
					50% {
						box-shadow:
							0 0 10px rgba(255, 255, 255, 0.6),
							0 0 17px rgba(149, 88, 248, 0.35),
							inset 0 0 8px rgba(255, 255, 255, 0.2);
					}
				}

				@keyframes wiggle {
					/* 0-87.5% is idle time (3.5 seconds at 4s total) */
					0%,
					87.5%,
					100% {
						transform: rotate(0deg);
					}
					/* Rotation starts at 87.5% mark for a 0.5-second duration */
					/* First wiggle right */
					88.5% {
						transform: rotate(3deg);
					}
					/* Back to center */
					89.5% {
						transform: rotate(-1deg);
					}
					/* Wiggle left */
					90.5% {
						transform: rotate(-3deg);
					}
					/* Back to center with smaller angle */
					91.5% {
						transform: rotate(2deg);
					}
					/* Smaller wiggle right */
					92.5% {
						transform: rotate(3deg);
					}
					/* Almost back to center */
					93.5% {
						transform: rotate(-2deg);
					}
					/* Final smaller wiggle left */
					94.5% {
						transform: rotate(-1deg);
					}
					/* Settle back to center with small overshoot */
					96% {
						transform: rotate(0.5deg);
					}
					/* Finally back to center */
					98% {
						transform: rotate(0deg);
					}
				}

				/* Apply wiggle to video mode */
				.video-mode {
					animation:
						pulse 8s ease-in-out infinite,
						wiggle 4s ease-in-out infinite;
					transform-origin: center center; /* Set rotation origin to center of button */
				}

				.toggle-playground-button:hover {
					animation: none;
					background: rgba(255, 255, 255, 0.15);
					border-color: rgba(255, 255, 255, 1);
					box-shadow:
						0 0 12px rgba(255, 255, 255, 0.7),
						0 0 22px rgba(149, 88, 248, 0.45),
						inset 0 0 8px rgba(255, 255, 255, 0.3);
					transform: translateY(-1px) scale(1.02); /* Reduced movement */
				}

				.toggle-playground-button:active {
					transform: translateY(0) scale(0.98);
					box-shadow:
						0 0 6px rgba(255, 255, 255, 0.5),
						0 0 12px rgba(149, 88, 248, 0.3),
						inset 0 0 5px rgba(255, 255, 255, 0.2);
				}

				.caption {
					margin-top: 15px;
					text-align: center;
					position: relative;
					z-index: 5;
				}

				@media (max-width: 768px) {
					.button-group {
						display: none;
					}
				}
			`}</style>
		</div>
	)
}
