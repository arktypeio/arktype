import React from "react"
import { Theme, Typography } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"

const styles = makeStyles((theme: Theme) => ({}))

export type InfoTextProps = {
    children: string
}

export const InfoText = ({ children }: InfoTextProps) => {
    return <Typography align="center">{children}</Typography>
}
