"use client"

import { motion } from "framer-motion"
import { VscodeIcon } from "./icons/vscode"
import {
	SiBun,
	SiDeno,
	SiIntellijidea,
	SiJavascript,
	SiNeovim,
	SiTypescript,
	SiGooglechrome,
	SiNodedotjs
} from "@icons-pack/react-simple-icons"

export type SvgLogoProps = {
	name: PlatformName
}

type PlatformName = keyof typeof platforms

const platforms = {
	js: SiJavascript,
	chromium: SiGooglechrome,
	node: SiNodedotjs,
	deno: SiDeno,
	ts: SiTypescript,
	neovim: SiNeovim,
	vscode: VscodeIcon,
	intellij: SiIntellijidea,
	bun: SiBun
}

type PlatformCloudProps = {
	main: PlatformName
	right: PlatformName
	top: PlatformName
	left: PlatformName
}

export const PlatformCloud = ({
	main,
	right,
	top,
	left
}: PlatformCloudProps) => {
	const Main = platforms[main]
	const Right = platforms[right]
	const Top = platforms[top]
	const Left = platforms[left]
	return (
		<div className="relative h-full w-[200px]">
			<div
				style={{
					position: "absolute",
					height: 70,
					opacity: 0.1,
					top: 55,
					left: 70
				}}
			>
				<Main height={70} width={undefined} aria-label={main} />
			</div>
			<div
				style={{
					position: "absolute",
					height: 60,
					opacity: 0.25,
					top: 50,
					left: 130
				}}
			>
				<Right height={60} width={undefined} aria-label={right} />
			</div>
			<div
				style={{
					position: "absolute",
					height: 50,
					opacity: 0.25,
					top: 100,
					left: 30
				}}
			>
				<Left height={50} width={undefined} aria-label={left} />
			</div>
			<motion.div
				style={{
					position: "absolute",
					height: 45,
					opacity: 0.25,
					top: 50,
					left: 50
				}}
			>
				<Top height={45} width={undefined} aria-label={top} />
			</motion.div>
		</div>
	)
}
