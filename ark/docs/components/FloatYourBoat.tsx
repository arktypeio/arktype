"use client"

import { BoatIcon } from "./icons/boat.tsx"
import { cx } from "class-variance-authority"

export const FloatYourBoat = () => (
	<>
		<div
			className={cx("pointer-events-none", "motion-reduce:hidden")}
			style={{
				position: "absolute",
				zIndex: -10,
				animation: "float 150s linear infinite,		bob 2s ease-in-out infinite",
				opacity: 0,
				transform: "translateZ(0)",
				bottom: "-30%"
			}}
		>
			<BoatIcon height={100} />
		</div>
		<style>
			{`
@keyframes float {
	0% {
		left: 0;
		opacity: 0;
	}
	2% {
		opacity: 1;
	}
	98% {
		opacity: 1;
	}
	100% {
		opacity: 0;
		left: calc(100% - 100px);
	}
}
@keyframes bob {
	0% {
		transform: translateY(0px);
	}
	50% {
		transform: translateY(2px);
	}
	100% {
		transform: translateY(0px);
	}
}
`}
		</style>
	</>
)
