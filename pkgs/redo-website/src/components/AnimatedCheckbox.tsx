import React, { FC } from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Theme } from "@material-ui/core"
import { useTheme } from "@material-ui/styles"

const tickVariants = {
    checked: { pathLength: 1, opacity: 1 },
    unchecked: { pathLength: 0, opacity: 0 }
}

export const AnimatedCheckbox: FC = () => {
    const [isChecked, setIsChecked] = useState(true)
    const theme = useTheme<Theme>()
    return (
        <motion.svg
            initial={false}
            animate={isChecked ? "checked" : "unchecked"}
            whileHover="hover"
            whileTap="pressed"
            viewBox="0 0 400 400"
            height={50}
            onClick={() => setIsChecked(!isChecked)}
        >
            <motion.path
                d="M 72 136 C 72 100.654 100.654 72 136 72 L 304 72 C 339.346 72 368 100.654 368 136 L 368 304 C 368 339.346 339.346 368 304 368 L 136 368 C 100.654 368 72 339.346 72 304 Z"
                fill="transparent"
                strokeWidth="50"
                stroke={theme.palette.primary.main}
            />
            <motion.path
                d="M 0 128.666 L 128.658 257.373 L 341.808 0"
                transform="translate(54.917 88.332) rotate(-4 170.904 128.687)"
                fill="transparent"
                strokeWidth="65"
                stroke="hsl(0, 0%, 100%)"
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={tickVariants}
                custom={isChecked}
            />
            <motion.path
                d="M 0 128.666 L 128.658 257.373 L 341.808 0"
                transform="translate(54.917 68.947) rotate(-4 170.904 128.687)"
                fill="transparent"
                strokeWidth="65"
                stroke={theme.palette.secondary.main}
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={tickVariants}
                custom={isChecked}
            />
        </motion.svg>
    )
}
