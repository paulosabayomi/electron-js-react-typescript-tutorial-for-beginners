import { TDirStructure } from "./types"

export const join_path = (path: string[]) => {
    const ua = navigator.userAgent.toLowerCase()
    const regexp = /linux|macintosh|windows/i
    const match = regexp.exec(ua)
    return match?.[0] == 'windows' ? path.join('\\') : path.join('/')
}

export const os_sep = () => {
    const ua = navigator.userAgent.toLowerCase()
    const regexp = /linux|macintosh|windows/i
    const match = regexp.exec(ua)
    return match?.[0] == 'windows' ? '\\' : '/'
}

export const sort_dir = (a: TDirStructure, b: TDirStructure) => {
    if (a.isDir !== b.isDir) {
        // @ts-ignore
        return b.isDir - a.isDir;
    }
    return a.name.localeCompare(b.name)
}