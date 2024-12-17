export interface File {
  type: 'file';
  content: string;
  isBinary: boolean;
}

export interface Folder {
  type: 'folder';
}

export type Dirent = File | Folder;

export type FileMap = Record<string, Dirent | undefined>;