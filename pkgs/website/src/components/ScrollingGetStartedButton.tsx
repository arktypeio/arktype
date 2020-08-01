import React from "react"
import Typist from "react-typist"
import { Text, Column, AnimatedLogo, Row, Card } from "@re-do/components"
import { GetStartedButton } from "."
import { motion, useViewportScroll, useTransform } from "framer-motion"
import { layout } from "./constants"

export type ScrollingGetStartedButtonProps = {}

export const ScrollingGetStartedButton = ({}: ScrollingGetStartedButtonProps) => {
    const { scrollY } = useViewportScroll()
    const scrollRange = [0, layout.headerHeight]
    const offsetRange = [layout.headerHeight + 24, 8]
    const colorRange = ["#ffffff", "#2979ff"]
    const getStartedOffset = useTransform(scrollY, scrollRange, offsetRange)
    const getStartedColor = useTransform(scrollY, scrollRange, colorRange)
    return (
        <motion.div
            style={{
                position: "fixed",
                height: layout.headerHeight,
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
