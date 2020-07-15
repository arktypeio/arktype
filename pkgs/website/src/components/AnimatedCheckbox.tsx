import React from "react"
import { motion } from "framer-motion"
import { useTheme } from "@re-do/components"

export type AnimatedCheckBoxProps = {
    checked: boolean
}

export const AnimatedCheckbox = ({ checked }: AnimatedCheckBoxProps) => {
    const theme = useTheme()
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
