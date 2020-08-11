import React from "react"
import { Button } from "@re-do/components"
import {
    motion,
    useAnimation,
    useViewportScroll,
    useTransform
} from "framer-motion"
import { layout, animations } from "../../../constants"

export type GetStartedDesktopProps = {
    onClick: () => void
}

export const GetStartedDesktop = ({ onClick }: GetStartedDesktopProps) => {
    const { scrollY } = useViewportScroll()
    const controls = useAnimation()
    const scrollRange = [0, layout.header.height]
    const offsetRange = [(layout.header.height * 3) / 2 + 16, 32]
    const colorRange = ["#ffffff", "#2979ff"]
    const getStartedOffset = useTransform(scrollY, scrollRange, offsetRange)
    const getStartedColor = useTransform(scrollY, scrollRange, colorRange)
    return (
        <motion.div
            style={{
                position: "fixed",
                height: layout.header.height,
                top: getStartedOffset,
                color: getStartedColor,
                zIndex: 3
            }}
            animate={animations.initialWiggle}
        >
            <motion.div
                animate={controls}
                onHoverStart={() => controls.start(animations.loopedWiggle)}
                onHoverEnd={() => controls.stop()}
                style={{
                    position: "relative",
                    left: 240
                }}
            >
                <Button
                    kind="secondary"
                    style={{
                        color: "inherit",
                        borderColor: "inherit",
                        fontWeight: 700
                    }}
                    fontSize={18}
                    onClick={onClick}
                >
                    Get Started
                </Button>
            </motion.div>
        </motion.div>
    )
}
