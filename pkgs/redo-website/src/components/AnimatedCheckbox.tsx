import React, { FC, useContext, useEffect, useState } from "react"
import { motion, useMotionValue } from "framer-motion"
import { useTheme } from "redo-components"
import { AppStateContext } from "../AppStateContext"

export type AnimatedCheckBoxProps = {
    checked: boolean
}

export const AnimatedCheckbox: FC<AnimatedCheckBoxProps> = ({ checked }) => {
    // const { contentHeight } = useContext(AppStateContext)
    const theme = useTheme()
    // const calculatePathLength = () => {
    //     if (!contentHeight) {
    //         return 0
    //     }
    //     const scrollableHeight = contentHeight - window.innerHeight
    //     const scrollProgress = window.scrollY / scrollableHeight
    //     if (scrollProgress < scrollRange[0]) {
    //         return 0
    //     } else if (scrollProgress > scrollRange[1]) {
    //         return 1
    //     } else {
    //         return (scrollProgress - scrollRange[0]) / scrollRange[1]
    //     }
    // }
    // const pathLength = useMotionValue(calculatePathLength())
    // useEffect(() => {
    //     const setPathLength = () => pathLength.set(calculatePathLength())
    //     window.addEventListener("scroll", setPathLength)
    //     return () => window.removeEventListener("scroll", setPathLength)
    // })
    const animationProps = {
        initial: {
            pathLength: 0,
            opacity: 0
        },
        animate: {
            pathLength: 1,
            opacity: 1
        },
        transition: {
            duration: 0.2
        }
    }
    return (
        <div style={{ height: 50, width: 50 }}>
            <motion.svg
                viewBox="0 0 420 400"
                fill="transparent"
                strokeWidth="65"
            >
                <motion.path
                    d="M 72 136 C 72 100.654 100.654 72 136 72 L 304 72 C 339.346 72 368 100.654 368 136 L 368 304 C 368 339.346 339.346 368 304 368 L 136 368 C 100.654 368 72 339.346 72 304 Z"
                    stroke={theme.palette.primary.main}
                    strokeWidth="50"
                />
                <motion.path
                    d="M 0 128.666 L 128.658 257.373 L 341.808 0"
                    transform="translate(54.917 88.332) rotate(-4 170.904 128.687)"
                    stroke="hsl(0, 0%, 100%)"
                    initial={{
                        pathLength: 0,
                        opacity: 0
                    }}
                    {...(checked ? animationProps : null)}
                />
                <motion.path
                    d="M 0 128.666 L 128.658 257.373 L 341.808 0"
                    transform="translate(54.917 68.947) rotate(-4 170.904 128.687)"
                    stroke={theme.palette.secondary.main}
                    initial={{
                        pathLength: 0,
                        opacity: 0
                    }}
                    {...(checked ? animationProps : null)}
                />
            </motion.svg>
        </div>
    )
}
