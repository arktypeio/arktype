import { useLocation } from "@docusaurus/router"
import { useColorMode } from "@docusaurus/theme-common"
import Collapse from "@mui/icons-material/ExpandLess"
import Expand from "@mui/icons-material/ExpandMore"
import { Button, Stack, useTheme } from "@mui/material"
import { motion } from "framer-motion"
import React, { useState } from "react"
import { StackBlitzDemo } from "../../docs/demos/StackBlitzDemo.tsx"
import { cascadiaCodeFamily } from "./theme.tsx"

export const HomeDemo = () => {
    const { pathname } = useLocation()
    const palette = useTheme().palette
    const isDarkMode = useColorMode().colorMode === "dark"
    const [isActive, setIsActive] = useState<boolean>(pathname.includes("try"))
    const backgroundColor = isDarkMode ? "#ffffff00" : "#000000aa"
    return (
        <Stack alignItems="start" width="100%">
            <Button
                variant="contained"
                sx={{
                    backgroundColor,
                    backdropFilter: "blur(2px)",
                    borderRadius: "2rem",
                    fontSize: "1.5rem",
                    fontFamily: cascadiaCodeFamily,
                    textTransform: "none",
                    color: palette.primary.light,
                    "&:hover": {
                        backgroundColor,
                        color: palette.primary.main
                    },
                    zIndex: 1
                }}
                onClick={() => setIsActive(!isActive)}
                endIcon={
                    <div style={{ display: "flex" }}>
                        {isActive ? <Collapse /> : <Expand />}
                    </div>
                }
            >
                {isActive ? "$ wq!" : "$ sudo chmod +wx demo.ts"}
                <motion.div
                    animate={{ opacity: 0 }}
                    transition={{
                        duration: 0.5,
                        repeatType: "mirror",
                        repeat: Infinity
                    }}
                >
                    _
                </motion.div>
            </Button>
            <Stack width="100%">
                {isActive ? (
                    <StackBlitzDemo embedId="demo" />
                ) : (
                    <video
                        src="/img/arktype.mp4"
                        autoPlay
                        loop
                        muted
                        disablePictureInPicture={true}
                        controls={true}
                        style={{
                            width: "100%",
                            marginTop: "-1.8rem"
                        }}
                    />
                )}
            </Stack>
        </Stack>
    )
}
