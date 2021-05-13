import React from "react"
import { Button } from "@re-do/components"
import { motion, useViewportScroll, useTransform } from "framer-motion"
import { animations } from "../../../constants"

export type GetStartedMobileProps = {
    onClick: () => void
    animateScroll?: boolean
}

export const GetStartedMobile = ({
    animateScroll,
    onClick
}: GetStartedMobileProps) => {
    const { scrollY } = useViewportScroll()
    // Setting the scroll range to [0, 0] renders components in the end state of their animation
    const scrollBoundaries = animateScroll
        ? animations.header.scrollRange
        : [0, 0]
    const top = useTransform(
        scrollY,
        scrollBoundaries,
        animations.header.offsetRange
    )
    const opacity = useTransform(scrollY, scrollBoundaries, [0, 1])
    return (
        <motion.div
            style={{
                position: "fixed",
                top,
                opacity,
                zIndex: 3
            }}
        >
            <Button
                kind="secondary"
                style={{
                    borderColor: "#fec400",
                    fontWeight: 700
                }}
                textColor="white"
                fontSize={18}
                onClick={onClick}
            >
                Get Started
            </Button>
        </motion.div>
    )
}
