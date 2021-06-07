import { TargetAndTransition } from "framer-motion"

export const layout = {
    header: {
        height: 80,
        slantHeight: 40
    },
    maxWidth: 1400
}

export const copy = {
    subheader: {
        content: `Building something great requires good tests, but it shouldn't be your job
            to automate, run, or maintain them. Redo learns how your app works and does
            all that for you.`
    }
}

const wiggle: TargetAndTransition = {
    rotate: [0, -2, 2, -2, 2, 0],
    transition: {
        duration: 0.4
    }
}
const initialWiggle: TargetAndTransition = {
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

export const animations: any = {
    initialWiggle,
    loopedWiggle,
    header: {
        scrollRange: [0, layout.header.height],
        offsetRange: [
            layout.header.height * 2 + layout.header.slantHeight,
            layout.header.height + layout.header.slantHeight
        ]
    }
}
