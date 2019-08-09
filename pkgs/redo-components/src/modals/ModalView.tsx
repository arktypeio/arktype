import React, { FC, cloneElement } from "react"
import { Menu as MuiMenu } from "@material-ui/core"
import { MenuProps as MuiMenuProps } from "@material-ui/core/Menu"
import { MenuItem } from "."

export type ModalViewProps = {}

export const ModalView: FC<ModalViewProps> = () => {
    const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
    return (
        <>
            {button}
            <MuiMenu
                anchorEl={anchor}
                open={!!anchor}
                onClose={() => setAnchor(null)}
                {...rest}
            >
                {Object.entries(options!).map(([name, onClick]) => (
                    <MenuItem onClick={onClick} key={name}>
                        {name}
                    </MenuItem>
                ))}
            </MuiMenu>
        </>
    )
}
