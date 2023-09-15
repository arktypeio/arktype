import { motion } from "framer-motion"
import React, { useState } from "react"

export const HomeDemo = () => {
	// const { pathname } = useLocation()
	// const palette = useTheme().palette
	// const isDarkMode = useColorMode().colorMode === "dark"
	// const [isActive, setIsActive] = useState<boolean>(pathname.includes("try"))
	// const backgroundColor = isDarkMode ? "#ffffff00" : "#000000aa"
	// return (
	// 	<Stack alignItems="start" width="100%">
	// 		<Button
	// 			variant="contained"
	// 			sx={{
	// 				backgroundColor,
	// 				backdropFilter: "blur(4px)",
	// 				borderRadius: "2rem",
	// 				fontSize: "1.5rem",
	// 				fontFamily: cascadiaCodeFamily,
	// 				textTransform: "none",
	// 				color: palette.primary.main,
	// 				"&:hover": {
	// 					backgroundColor,
	// 					color: palette.secondary.main,
	// 					backdropFilter: "blur(6px)"
	// 				},
	// 				zIndex: 1
	// 			}}
	// 			onClick={() => setIsActive(!isActive)}
	// 			endIcon={
	// 				<div style={{ display: "flex" }}>
	// 					{isActive ? <Collapse /> : <Expand />}
	// 				</div>
	// 			}
	// 		>
	// 			{isActive ? "$ wq!" : "$ code demo.ts"}
	// 			<motion.div
	// 				animate={{ opacity: 0 }}
	// 				transition={{
	// 					duration: 0.5,
	// 					repeatType: "mirror",
	// 					repeat: Infinity
	// 				}}
	// 			>
	// 				_
	// 			</motion.div>
	// 		</Button>
	// 		<Stack width="100%">
	// 			{isActive ? (
	// 				<StackBlitzDemo embedId="demo" />
	// 			) : (
	// 				<AutoplayDemo
	// 					src="/img/arktype.mp4"
	// 					style={{
	// 						width: "100%",
	// 						marginTop: "-2.8rem"
	// 					}}
	// 				/>
	// 			)}
	// 		</Stack>
	// 		<sub>
	// 			<code>typescript@4.9.5</code> in VS Code— no extensions or plugins
	// 			required (
	// 			<a href="https://github.com/arktypeio/arktype#how" target="_blank">
	// 				how?
	// 			</a>
	// 			)
	// 		</sub>
	// 	</Stack>
	// )
}
