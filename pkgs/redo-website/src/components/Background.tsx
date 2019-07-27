import React, { useEffect } from "react"
import { makeStyles } from "@material-ui/styles"
import { KeyboardArrowDown as ArrowIcon } from "@material-ui/icons"

const ARROW = {
    count: 8,
    xOffsetRange: 50,
    minSize: 40,
    maxSize: 80,
    minFallTime: 10 * 1000,
    maxFallTime: 20 * 1000,
    fallStagger: 1 * 1000,
    opacity: 0.6,
    color: "#74D6FF"
}

const style = makeStyles({
    area: {
        background: "#2879ff",
        width: "100vw",
        height: "100vh"
    }
})

export const Background = () => {
    const { area } = style()
    const { count } = ARROW
    return (
        <div className={area}>
            {/* {[...Array(count).keys()].map(index => (
                <Arrow key={index} index={index} />
            ))} */}
        </div>
    )
}

// export const Arrow = ({ index }: { index: number }) => {
//     const {
//         minSize,
//         maxSize,
//         minFallTime,
//         maxFallTime,
//         fallStagger,
//         opacity,
//         xOffsetRange,
//         count,
//         color
//     } = ARROW
//     const fontSize = anime.random(minSize, maxSize)
//     const availableWidth = window.innerWidth / count
//     useEffect(() => {
//         anime({
//             targets: `.animated-arrow-${index}`,
//             translateY: innerHeight + maxSize,
//             duration: _ => anime.random(minFallTime, maxFallTime),
//             easing: "easeInCirc",
//             delay: index * fallStagger,
//             loop: true
//         })
//     })
//     const xOffset = anime.random(-xOffsetRange, xOffsetRange)
//     return (
//         <ArrowIcon
//             className={`animated-arrow-${index}`}
//             style={{
//                 position: "absolute",
//                 left: index * availableWidth + xOffset,
//                 top: -maxSize,
//                 fontSize,
//                 opacity,
//                 color
//             }}
//         />
//     )
// }
