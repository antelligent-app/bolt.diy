
class FileClass {
    name: string;
    isSudo: boolean;
    content: string;
    permissions: string;

    constructor(name: string, content: string, isSudo: boolean, permissions: string) {
        this.name = name;
        this.content = content;
        this.isSudo = isSudo;
        this.permissions = permissions;
    }

    cat() {
        return this.content;
    }

    echo(content: string) {
        this.content = content;
    }

    rm() {
        this.content = '';
    }

    sudo() {
        this.isSudo = true;
    }

    chmod(permissions: string) {
        this.permissions = permissions;
    }

    touch(name: string, content: string) {
        return new FileClass(name, content, this.isSudo, this.permissions);
    }
}

export default FileClass;