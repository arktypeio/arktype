import ArkSvg from "@site/static/img/ark.svg"
import { motion } from "framer-motion"
import React from "react"

const LOOP_DURATION = 120

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
            animate={{ left: "100%" }}
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
