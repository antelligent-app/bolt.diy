const initialFileSystem = {
    "name": "root",
    "isSudo": false,
    "permissions": "755",
    "children": [
        {
            "name": "Developers",
            "isSudo": false,
            "permissions": "755",
            "children": [],
            "files": [{
                "name": "Koushik_Roy",
                "content": "Koushik Roy is a developer",
                "isSudo": false,
                "permissions": "644"
            },{
                "name": "Gaurav_Gandhi",
                "content": "Gaurav Gandhi is a developer",
                "isSudo": false,
                "permissions": "644"
            },{
                "name": "Dinesh_Kumar",
                "content": "Dinesh Kumar is a developer",
                "isSudo": false,
                "permissions": "644"
            }]
        },
        {
            "name": "home",
            "isSudo": false,
            "permissions": "755",
            "children": [],
            "files": [
                {
                    "name": "file1.txt",
                    "content": "User's text file",
                    "isSudo": false,
                    "permissions": "644"
                }
            ]
        },
        {
            "name": "etc",
            "isSudo": false,
            "permissions": "755",
            "children": [
                {
                    "name": "nginx",
                    "isSudo": true,
                    "permissions": "755",
                    "children": [],
                    "files": []
                }
            ],
            "files": []
        },
        // {
        //     "name": "Projects",
        //     "isSudo": false,
        //     "permissions": "755",
        //     "children": [],
        //     "files": []
        // }
    ],
    "files": [
        {
            "name": "About",
            "content": `

            `,
            "isSudo": false,
            "permissions": "644"
        },
        {
            "name": "Contact",
            "content": `

            `,
            "isSudo": false,
            "permissions": "644"
        }
    ]
};

export default initialFileSystem;