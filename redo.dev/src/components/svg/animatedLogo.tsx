import { useTheme } from "@mui/material"
import { motion, SVGMotionProps } from "framer-motion"
import React, { CSSProperties } from "react"

export type AnimatedLogoProps = {
    style?: CSSProperties
}

export const AnimatedLogo = ({ style = {} }: AnimatedLogoProps) => {
    const {
        palette: { secondary, error, success }
    } = useTheme()
    const pathAnimationContext: PathAnimationContext = {
        nextStart: frameStartTime(1) + PATH_ANIMATION_DURATION
    }
    return (
        <motion.svg style={style} viewBox="0 0 1823 576">
            <motion.g
                id="background"
                fill="none"
                strokeLinecap="round"
                strokeWidth="72"
            >
                <motion.path
                    id="rMain"
                    d="m54.26 516.9v-259.9c10.07-85.6 64.81-169.7 148.8-197.8 74.87-26.98 162.5 0.3147 213.4 60.18 9.632 10.87 18.22 22.65 25.68 35.11"
                    stroke={PRIMARY_DARK}
                />
                <motion.path
                    id="rArrow"
                    d="m353.4 154.4h88.82v-88.82"
                    strokeLinejoin="round"
                    {...createPathAnimationProps(
                        secondary.main,
                        pathAnimationContext
                    )}
                />
                <motion.path
                    id="eMain"
                    d="m840.9 482.5a213.1 238.5 0 0 1-252.7-6.964 213.1 238.5 0 0 1-69.05-272.1 213.1 238.5 0 0 1 211.7-154.5 213.1 238.5 0 0 1 194.7 180.4"
                    stroke={PRIMARY_DARK}
                    strokeLinejoin="round"
                />
                <motion.path
                    id="eLine"
                    d="m600 225h235"
                    {...createPathAnimationProps(
                        secondary.main,
                        pathAnimationContext
                    )}
                />
                <motion.circle
                    id="colonTop"
                    cx="1031"
                    cy="225"
                    r="36"
                    transition={{
                        delay: INITIAL_DELAY,
                        duration: ANIMATION_SECONDS
                    }}
                    animate={{
                        fill: [
                            error.main,
                            TRANSPARENT,
                            TRANSPARENT,
                            TRANSPARENT,
                            success.main
                        ]
                    }}
                />
                <motion.circle
                    id="colonBottom"
                    cx="1033"
                    cy="392.1"
                    r="36"
                    transition={{
                        delay: INITIAL_DELAY,
                        duration: ANIMATION_SECONDS
                    }}
                    animate={{
                        fill: [
                            TRANSPARENT,
                            secondary.main,
                            secondary.main,
                            secondary.main,
                            success.main
                        ]
                    }}
                />
                <motion.path
                    id="dMain"
                    d="m1042 524.5c115.5-6.018 205.7-113.8 203.2-243-2.486-129.2-96.73-232.5-212.4-233"
                    stroke={PRIMARY_DARK}
                />
                <motion.path
                    id="oMain"
                    d="m1559 48.53a192 192 0 0 0-56.07 8.531c-82.15 25.3-145.2 104.4-155.2 203.2-12.18 120.3 58.18 231.8 163.6 259.2 105.4 27.39 212.5-37.99 248.9-152 36.45-114-9.264-240.5-106.3-294.2"
                    stroke={PRIMARY_DARK}
                />
                <motion.path
                    id="oArrow"
                    d="m1743 73.4h-88.82v88.82"
                    strokeLinejoin="round"
                    {...createPathAnimationProps(
                        secondary.main,
                        pathAnimationContext
                    )}
                />
            </motion.g>
        </motion.svg>
    )
}

/*
 * Since the Logo is currently always displayed on a #1b1b1b background,
 * always use dark version of primary
 */
const PRIMARY_DARK = "#264bcf"
const TRANSPARENT = "#1b1b1b00"
const INITIAL_DELAY = 0.5
const ANIMATION_SECONDS = 2
const FRAMES = 5
const FRAME_SECONDS = ANIMATION_SECONDS / FRAMES
const PATH_DRAW_FRAMES = 3
const PATH_COUNT = 3
const PATH_ANIMATION_DURATION =
    // Speed up path draw so that we can add an initial delay
    (PATH_DRAW_FRAMES * FRAME_SECONDS) / (PATH_COUNT + 2)

const frameStartTime = (frameIndex: number) =>
    INITIAL_DELAY + frameIndex * FRAME_SECONDS

type PathAnimationContext = {
    nextStart: number
}

const createPathAnimationProps = (
    color: string,
    context: PathAnimationContext
): SVGMotionProps<SVGPathElement> => {
    const props = {
        transition: {
            delay: context.nextStart,
            duration: PATH_ANIMATION_DURATION
        },
        animate: {
            stroke: [TRANSPARENT, color],
            pathLength: [0, 1]
        }
    }
    context.nextStart += PATH_ANIMATION_DURATION
    return props
}
