import React, { FC } from "react"
import {
    IconButton as MuiIconButton,
    SvgIcon as MuiSvgIcon
} from "@material-ui/core"
import { IconButtonProps as MuiIconButtonProps } from "@material-ui/core/IconButton"
import { SvgIconProps as MuiSvgIconProps } from "@material-ui/core/SvgIcon"
import MuiPlayIcon from "@material-ui/icons/PlayArrow"
import MuiAddIcon from "@material-ui/icons/Add"
import MuiScheduleIcon from "@material-ui/icons/Schedule"
import MuiHelpIcon from "@material-ui/icons/Help"
import MuiAccountIcon from "@material-ui/icons/AccountCircle"
import MuiViewIcon from "@material-ui/icons/Visibility"

export type IconButtonProps = MuiIconButtonProps & {
    Icon: React.ComponentType<MuiSvgIconProps>
    iconProps?: MuiSvgIconProps
}

export const IconButton: FC<IconButtonProps> = ({
    Icon,
    iconProps,
    ...rest
}) => (
    <MuiIconButton {...rest}>
        <Icon {...iconProps} />
    </MuiIconButton>
)

export const iconButtonFrom = (
    Icon: React.ComponentType<MuiSvgIconProps>,
    onClick?: any
) => (props: Omit<IconButtonProps, "Icon">) => (
    <IconButton
        Icon={Icon}
        onClick={props.onClick ? props.onClick : onClick}
        {...props}
    />
)

export type SvgIconProps = MuiSvgIconProps & {
    path: string
    fill?: string
}

export const SvgIcon: FC<SvgIconProps> = ({
    path,
    fill = "#000000",
    ...rest
}: Partial<SvgIconProps>) => (
    <MuiSvgIcon {...rest}>
        <path fill={fill} d={path} />
    </MuiSvgIcon>
)

export const svgIconFrom = (path: string) => (
    props: Omit<SvgIconProps, "path">
) => <SvgIcon path={path} {...props} />

export const PlayIcon = MuiPlayIcon
export const PlayButton = iconButtonFrom(PlayIcon)
export const AddIcon = MuiAddIcon
export const AddButton = iconButtonFrom(AddIcon)
export const HelpIcon = MuiHelpIcon
export const HelpButton = iconButtonFrom(HelpIcon)
export const AccountIcon = MuiAccountIcon
export const AccountButton = iconButtonFrom(AccountIcon)
export const ViewIcon = MuiViewIcon
export const ViewButton = iconButtonFrom(ViewIcon)
export const ScheduleIcon = MuiScheduleIcon
export const ScheduleButton = iconButtonFrom(ScheduleIcon)
