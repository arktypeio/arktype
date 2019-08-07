import React, { FC } from "react"
import MuiGrid, {
    GridProps as MuiGridProps,
    GridItemsAlignment
} from "@material-ui/core/Grid"

import { makeKinds, KindFrom } from "../common"

export type ContainerProps = MuiGridProps & {
    align?: GridItemsAlignment
}

const useKind = makeKinds<MuiGridProps>()({
    primary: {
        color: ""
    },
    secondary: {
        variant: "outlined",
        style: {
            color: "black"
        }
    }
})

export const Container: FC<ContainerProps> = ({ align, ...rest }) => {
    return <Grid container item alignItems={align} wrap="nowrap" {...rest} />
}
