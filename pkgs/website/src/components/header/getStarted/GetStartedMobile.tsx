import React from "react"
import { Button } from "@re-do/components"
import { motion, useViewportScroll, useTransform } from "framer-motion"
import { animations } from "../../../constants"

const { scrollRange, offsetRange } = animations.header

export type GetStartedMobileProps = {
    onClick: () => void
}

export const GetStartedMobile = ({ onClick }: GetStartedMobileProps) => {
    const { scrollY } = useViewportScroll()
    const top = useTransform(scrollY, scrollRange, offsetRange)
    const opacity = useTransform(scrollY, scrollRange, [0, 1])
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
                    color: "white",
                    borderColor: "#fec400",
                    fontWeight: 700
                }}
                fontSize={18}
                onClick={onClick}
            >
                Get Started
            </Button>
        </motion.div>
    )
}
