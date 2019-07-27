import React, { useEffect } from "react"
import { makeStyles } from "@material-ui/styles"
import OutlinedLogo from "../assets/outlinedLogo.svg"

const style = makeStyles({
    logo: {
        maxWidth: 800
    }
})

export const AnimatedLogo = () => {
    const { logo } = style()
    useEffect(() => {
        // anime({
        //     targets: [
        //         "#r-main",
        //         "#e-main",
        //         "#e-cross",
        //         "#d-main",
        //         "#d-cross",
        //         "#o-main"
        //     ],
        //     strokeDashoffset: [anime.setDashoffset, 0],
        //     duration: 1500,
        //     easing: "linear"
        // })
        // anime({
        //     targets: ["#r-arrow"],
        //     strokeDashoffset: [anime.setDashoffset, 0],
        //     delay: 1750,
        //     duration: 250,
        //     easing: "linear"
        // })
        // anime({
        //     targets: ["#o-arrow"],
        //     strokeDashoffset: [anime.setDashoffset, 0],
        //     delay: 2000,
        //     duration: 250,
        //     easing: "linear"
        // })
    })
    return <OutlinedLogo className={logo} />
}
