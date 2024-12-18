import type { JSX } from "react";
import DirClass from "./DirClass";

export type FileType = {
    name: string;
    content: string;
    isSudo: boolean;
    permissions: string;
}

export type DirType = {
    name: string;
    isSudo: boolean;
    permissions: string;
    children: DirType[];  // Subdirectories
    files: FileType[];          // Files within the directory
}

export type CmdHistory = {
    historyId: string;
    cmd: string;
    dir: DirClass;
    output: {
        outputId: string;
        jsxs: JSX.Element;
    }[];
}