import React, { useState } from "react"
import Link from "@docusaurus/Link"
import useBaseUrl from "@docusaurus/useBaseUrl"
import { Button } from "@re-do/components"
import { motion, useAnimation } from "framer-motion"

export type GetStartedButtonProps = {}

export const GetStartedButton = ({}: GetStartedButtonProps) => {
    const controls = useAnimation()
    const wiggle = {
        rotate: [0, -2, 2, -2, 2, 0],
        transition: {
            duration: 0.3
        }
    }
    const initialWiggle = {
        ...wiggle,
        transition: {
            ...wiggle.transition,
            delay: 2.2
        }
    }
    const loopedWiggle = {
        ...wiggle,
        transition: {
            ...wiggle.transition,
            loop: Infinity,
            repeatDelay: 0.7
        }
    }
    return (
        <Link to={useBaseUrl("docs/")}>
            <motion.div animate={initialWiggle}>
                <motion.div
                    animate={controls}
                    onHoverStart={() => controls.start(loopedWiggle)}
                    onHoverEnd={() => controls.stop()}
                >
                    <Button
                        kind="secondary"
                        style={{
                            color: "white",
                            borderColor: "white",
                            fontSize: "large",
                            fontWeight: 700
                        }}
                    >
                        Get Started
                    </Button>
                </motion.div>
            </motion.div>
        </Link>
    )
}
