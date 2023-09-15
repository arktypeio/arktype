import { motion } from "framer-motion"
import React from "react"
import Chromium from "../assets/chromium.svg"
import Deno from "../assets/deno.svg"
import Intellij from "../assets/intellij.svg"
import Js from "../assets/js.svg"
import Neovim from "../assets/neovim.svg"
import Node from "../assets/node.svg"
import Ts from "../assets/ts.svg"
import Vscode from "../assets/vscode.svg"

export type SvgLogoProps = {
	name: LogoName
}

type LogoName = keyof typeof logos

const logos = {
	js: Js,
	chromium: Chromium,
	node: Node,
	deno: Deno,
	ts: Ts,
	neovim: Neovim,
	vscode: Vscode,
	intellij: Intellij
}

const SvgLogo = ({ name }: SvgLogoProps) => (
	<img style={{ height: "100%" }} src={logos[name]?.src} />
)

export type LogoCloudProps = {
	main: LogoName
	right: LogoName
	top: LogoName
	bottom: LogoName
}

export const LogoCloud = ({ main, right, top, bottom }: LogoCloudProps) => (
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
				top: 100,
				left: 30
			}}
		>
			<SvgLogo name={bottom} />
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
