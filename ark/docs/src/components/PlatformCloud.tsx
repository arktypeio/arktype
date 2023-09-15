import { motion } from "framer-motion"
import React from "react"
import Bun from "../assets/bun.svg"
import Chromium from "../assets/chromium.svg"
import Deno from "../assets/deno.svg"
import Intellij from "../assets/intellij.svg"
import Js from "../assets/js.svg"
import Neovim from "../assets/neovim.svg"
import Node from "../assets/node.svg"
import Ts from "../assets/ts.svg"
import Vscode from "../assets/vscode.svg"

export type SvgLogoProps = {
	name: PlatformName
}

type PlatformName = keyof typeof platforms

const platforms = {
	js: Js,
	chromium: Chromium,
	node: Node,
	deno: Deno,
	ts: Ts,
	neovim: Neovim,
	vscode: Vscode,
	intellij: Intellij,
	bun: Bun
}

const SvgLogo = ({ name }: SvgLogoProps) => (
	<img style={{ height: "100%" }} src={platforms[name]?.src} />
)

export type PlatformCloudProps = {
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
}: PlatformCloudProps) => (
	<div style={{ position: "relative", height: "100%", width: 200 }}>
		<div
			style={{
				position: "absolute",
				height: 70,
				opacity: 0.1,
				top: 55,
				left: 70
			}}
		>
			<SvgLogo name={main} />
		</div>
		<div
			style={{
				position: "absolute",
				height: 60,
				opacity: 0.25,
				top: 30,
				left: 130
			}}
		>
			<SvgLogo name={right} />
		</div>
		<div
			style={{
				position: "absolute",
				height: 50,
				opacity: 0.25,
				top: 75,
				left: 30
			}}
		>
			<SvgLogo name={left} />
		</div>
		<motion.div
			style={{
				position: "absolute",
				height: 45,
				opacity: 0.25,
				top: 20,
				left: 50
			}}
		>
			<SvgLogo name={top} />
		</motion.div>
	</div>
)
