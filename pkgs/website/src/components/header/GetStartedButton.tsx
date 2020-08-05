import React, { useState } from "react"
import { Button } from "@re-do/components"
import { Dialog } from "@material-ui/core"
import { motion, useAnimation, MotionValue } from "framer-motion"
import { SignUpDialog } from "../signUp/SignUp"

export type GetStartedButtonProps = {
    color?: string | MotionValue
}

export const GetStartedButton = ({
    color = "white"
}: GetStartedButtonProps) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const controls = useAnimation()
    const wiggle = {
        rotate: [0, -2, 2, -2, 2, 0],
        transition: {
            duration: 0.4
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
        <motion.div animate={initialWiggle}>
            <motion.div
                animate={controls}
                onHoverStart={() => controls.start(loopedWiggle)}
                onHoverEnd={() => controls.stop()}
                style={{
                    color,
                    borderColor: color
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
                    onClick={() => setDialogOpen(true)}
                >
                    Get Started
                </Button>
                <SignUpDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                />
            </motion.div>
        </motion.div>
    )
}
