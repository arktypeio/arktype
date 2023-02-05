import ArkSvg from "@site/static/img/ark.svg"
import { motion } from "framer-motion"
import React from "react"

const LOOP_DURATION = 120
const BOB_HEIGHT = 2
const BOB_INTERVAL = 2
const bobFrames: number[] = []
for (let i = 0; i < LOOP_DURATION / BOB_INTERVAL; i++) {
    bobFrames.push(i % 2 ? BOB_HEIGHT : 0)
}

export const Boat = () => {
    return (
        <motion.div
            style={{
                position: "absolute",
                bottom: -20,
                opacity: 0.4,
                zIndex: 1
            }}
            initial={{ left: "-5%" }}
            animate={{
                left: "100%",
                y: bobFrames
            }}
            transition={{
                duration: LOOP_DURATION,
                repeat: Infinity,
                ease: "linear",
                delay: 1
            }}
        >
            <ArkSvg style={{ width: 100 }} />
        </motion.div>
    )
}
