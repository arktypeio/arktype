import React from "react"
import { GetStartedButton } from "./GetStartedButton"
import { motion, useViewportScroll, useTransform } from "framer-motion"
import { layout } from "../constants"

export type ScrollingGetStartedButtonProps = {}

export const ScrollingGetStartedButton = ({}: ScrollingGetStartedButtonProps) => {
    const { scrollY } = useViewportScroll()
    const scrollRange = [0, layout.header.height]
    const offsetRange = [layout.header.height + 32, 8]
    const colorRange = ["#ffffff", "#2979ff"]
    const getStartedOffset = useTransform(scrollY, scrollRange, offsetRange)
    const getStartedColor = useTransform(scrollY, scrollRange, colorRange)
    return (
        <motion.div
            style={{
                position: "fixed",
                height: layout.header.height,
                width: 640,
                top: getStartedOffset,
                color: getStartedColor,
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                zIndex: 1
            }}
        >
            <GetStartedButton color={getStartedColor} />
        </motion.div>
    )
}
