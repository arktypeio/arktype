import React, { FC } from "react"
import Grid, { GridProps } from "@material-ui/core/Grid"

export type ItemProps = Omit<GridProps, "direction">

export const Item: FC<ItemProps> = props => <Grid item {...props} />
