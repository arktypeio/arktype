"use client"

import { CodeIcon, VideoIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Playground } from "./Playground"

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
		setShowPlayground(!showPlayground)
	}

	return (
		<div style={{ position: "relative", width: "100%" }}>
			{showPlayground ?
				<div
					style={{
						height: dimensions.height,
						width: dimensions.width,
						margin: "0 auto" // Center the playground
					}}
				>
					<Playground />
				</div>
			:	<video
					ref={videoRef}
					autoPlay
					loop
					controls={true}
					playsInline
					muted
					disablePictureInPicture={true}
					style={{ width: "100%", display: "block", margin: "0 auto" }} // Ensure video is centered
					{...props}
				/>
			}

			<button
				onClick={togglePlayground}
				className={`toggle-playground-button ${showPlayground ? "" : "video-mode"}`}
				aria-label={showPlayground ? "Switch to Demo" : "Switch to Playground"}
			>
				{showPlayground ?
					<>
						<VideoIcon size={16} />
						<span>Demo Mode</span>
					</>
				:	<>
						<CodeIcon size={16} />
						<span>Playground Mode</span>
					</>
				}
			</button>

			<p>
				Type-level feedback with each keystroke-{" "}
				<b>no plugins or build steps required</b>.
			</p>

			<style jsx>{`
				.toggle-playground-button {
					position: absolute;
					top: 10px;
					right: 10px;
					display: flex;
					align-items: center;
					gap: 6px;
					padding: 8px 12px;
					background: rgba(0, 19, 35, 0.5); /* More transparent background */
					background-image: linear-gradient(
						135deg,
						rgba(255, 255, 255, 0.25),
						rgba(255, 255, 255, 0.05) 30%,
						rgba(0, 19, 35, 0.6) 80%
					); /* Enhanced diagonal glass gradient */
					color: #fff;
					border: none;
					border-radius: 1rem;
					font-size: 14px;
					font-weight: 500;
					cursor: pointer;
					backdrop-filter: blur(10px); /* Increased blur */
					box-shadow:
						0 2px 10px rgba(0, 103, 179, 0.3),
						0 0 0 1px rgba(255, 255, 255, 0.2); /* Glow + outline */
					transition: all 0.2s ease;
					z-index: 10;
					border: 1px solid rgba(255, 255, 255, 0.15);
					animation: pulse 8s ease-in-out infinite; /* Just pulse by default */
				}

				/* Pulse glow animation */
				@keyframes pulse {
					0%,
					100% {
						box-shadow:
							0 2px 10px rgba(0, 103, 179, 0.3),
							0 0 0 1px rgba(255, 255, 255, 0.2);
					}
					50% {
						box-shadow:
							0 2px 15px rgba(0, 103, 179, 0.5),
							0 0 0 1px rgba(255, 255, 255, 0.3);
					}
				}

				/* Wiggle animation */
				@keyframes wiggle {
					0%,
					90%,
					100% {
						transform: translateX(0);
					}
					92%,
					96% {
						transform: translateX(-2px);
					}
					94%,
					98% {
						transform: translateX(2px);
					}
				}

				/* Apply wiggle ONLY when in video mode (not showing playground) */
				.video-mode {
					animation:
						pulse 8s ease-in-out infinite,
						wiggle 15s ease-in-out infinite;
				}

				.toggle-playground-button:hover {
					animation: none; /* Stop animations on hover */
					background-image: linear-gradient(
						135deg,
						rgba(255, 255, 255, 0.35),
						rgba(255, 255, 255, 0.1) 30%,
						rgba(0, 19, 35, 0.7) 80%
					);
					box-shadow:
						0 4px 15px rgba(0, 103, 179, 0.6),
						0 0 0 1px rgba(255, 255, 255, 0.3);
					transform: translateY(-1px);
					border: 1px solid rgba(255, 255, 255, 0.25);
				}

				.toggle-playground-button:active {
					transform: translateY(0px);
					box-shadow:
						0 1px 8px rgba(0, 103, 179, 0.4),
						0 0 0 1px rgba(255, 255, 255, 0.2);
				}

				@media (max-width: 768px) {
					.toggle-playground-button {
						display: none;
					}
				}
			`}</style>
		</div>
	)
}
