import { motion } from "framer-motion"
import React from "react"

export type SvgLogoProps = {
	name: string
}

const SvgLogo = ({ name }: SvgLogoProps) => (
	<img style={{ height: "100%" }} src={`/img/integrationLogos/${name}.svg`} />
)

export type LogoCloudProps = {
	names: [string, string, string, string]
}

export const LogoCloud = ({ names }: LogoCloudProps) => (
	<div style={{ position: "relative", height: "100%", width: 200 }}>
		<motion.div
			style={{
				position: "absolute",
				height: 70,
				opacity: 0.1
			}}
			initial={{ top: 55, left: 70 }}
		>
			<SvgLogo name={names[0]} />
		</motion.div>
		<motion.div
			style={{
				position: "absolute",
				height: 60,
				opacity: 0.25
			}}
			initial={{ top: 30, left: 130 }}
		>
			<SvgLogo name={names[1]} />
		</motion.div>
		<motion.div
			style={{
				position: "absolute",
				height: 50,
				opacity: 0.25
			}}
			initial={{ top: 100, left: 30 }}
		>
			<SvgLogo name={names[2]} />
		</motion.div>
		<motion.div
			style={{
				position: "absolute",
				height: 45,
				opacity: 0.25
			}}
			initial={{ top: 20, left: 50 }}
		>
			<SvgLogo name={names[3]} />
		</motion.div>
	</div>
)
