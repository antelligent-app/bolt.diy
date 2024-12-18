import FileClass from './FileClass';

class DirClass {
    name: string;
    dir: DirClass[];
    parent: DirClass | null;
    files: FileClass[];
    isSudo: boolean;
    permissions: string; // 666, 777, 755, 644

    constructor(name: string, children: DirClass[], parent: DirClass | null, isSudo: boolean, files: FileClass[], permissions: string) {
        this.name = name;
        this.dir = children;
        this.parent = parent;
        this.isSudo = isSudo;
        this.files = files;
        this.permissions = permissions;
    }

    ls() {
        const lists:{
            name: string,
            isDir: boolean
        }[] = []

        this.files.forEach(f => {
            lists.push({
                name: f.name,
                isDir: false
            })
        })
        
        this.dir.forEach(d => {
            lists.push({
                name: d.name,
                isDir: true
            })
        })


        return lists;
    }

    mkdir(name: string) {
        this.dir.push(new DirClass(name, [], this, this.isSudo, [], this.permissions));
    }

    touch(name: string, content: string, permissions: string) {
        this.files.push(new FileClass(name, content, this.isSudo, permissions));
    }

    rm(name: string) {
        this.dir = this.dir.filter(d => d.name !== name);
        this.files = this.files.filter(f => f.name !== name);
    }

    sudo() {
        this.isSudo = true;
    }

    chmod(permissions: string) {
        this.permissions = permissions;
    }

    cd(name: string) {
        return this.dir.find(d => d.name === name);
    }

    cat(name: string) {
        const file = this.files.find(f => f.name === name);
        return file ? file.cat() : 'No such file found';
    }

    echo(name: string, content: string) {
        const file = this.files.find(f => f.name === name);
        if (file) {
            file.echo(content);
        } else {
            this.files.push(new FileClass(name, content, this.isSudo, this.permissions));
        }
    }

    chmodFile(name: string, permissions: string) {
        const file = this.files.find(f => f.name === name);
        if (file) {
            file.chmod(permissions);
        }
    }

    sudoFile(name: string) {
        const file = this.files.find(f => f.name === name);
        if (file) {
            file.sudo();
        }
    }

    cp(name: string, newName: string){
        const file = this.files.find(f => f.name === name);
        if (file) {
            this.files.push(new FileClass(newName, file.content, file.isSudo, file.permissions));
        }
    }

    mv(name: string, newName: string){
        const file = this.files.find(f => f.name === name);
        if (file) {
            file.name = newName;
        }
    }

}

export default DirClass;