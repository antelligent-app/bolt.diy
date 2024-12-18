
const commands = [
    {
        cmd: 'ls',
        description: 'List directory contents',
        args: [],
        permission: 'any'
    },
    {
        cmd: 'cd',
        description: 'Change directory. Use ".." to go up, "/" or "~" for root',
        args: [{
            name: 'dir',
            type: 'string',
            description: 'Directory to navigate to'
        }],
        permission: 'any'
    },
    {
        cmd: 'mkdir',
        description: 'Create a new directory',
        args: [{
            name: 'name',
            type: 'string',
            description: 'Directory name'
        }],
        permission: 'user'
    },
    {
        cmd: 'touch',
        description: 'Create a new file',
        args: [
            {
                name: 'name',
                type: 'string',
                description: 'File name'
            },
            {
                name: 'content',
                type: 'string',
                description: 'File content'
            },
            {
                name: 'permissions',
                type: 'string',
                description: 'File permissions'
            }
        ],
        permission: 'user'
    },
    {
        cmd: 'rm',
        description: 'Remove a file or directory',
        args: [{
            name: 'name',
            type: 'string',
            description: 'File or directory name'
        }],
        permission: 'admin'
    },
    {
        cmd: 'cat',
        description: 'Display file contents',
        args: [{
            name: 'file',
            type: 'string',
            description: 'File name'
        }],
        permission: 'any'
    },
    {
        cmd: 'projects',
        description: 'List all your projects',
        args: [],
        permission: 'user'
    },
    {
        cmd: 'start',
        description: 'Start working on a specific project',
        args: [{
            name: 'project-name',
            type: 'string',
            description: 'Project name'
        }],
        permission: 'user'
    },
    {
        cmd: 'create',
        description: 'Create a new project',
        args: [{
            name: 'project-name',
            type: 'string',
            description: 'Project name'
        }],
        permission: 'user'
    },
    {
        cmd: 'login',
        description: 'Log in to your account',
        args: [{
            name: 'email',
            type: 'string',
            description: 'Your email'
        },
        {
            name: 'password',
            type: 'string',
            description: 'Your password'
        }],
        permission: 'any'
    },
    {
        cmd: 'register',
        description: 'Create a new account',
        args: [
            {
                name: 'username',
                type: 'string',
                description: 'Your username'
            },
            {
                name: 'email',
                type: 'string',
                description: 'Your email'
            },
            {
                name: 'password',
                type: 'string',
                description: 'Your password'
            }
        ],
        permission: 'any'
    },
    {
        cmd: 'logout',
        description: 'Log out from your account',
        args: [],
        permission: 'user'
    },
    {
        cmd: 'set',
        description: 'Set an environment variable',
        args: [
            {
                name: 'key',
                type: 'string',
                description: 'Variable name'
            },
            {
                name: 'value',
                type: 'string',
                description: 'Variable value'
            }
        ],
        permission: 'user'
    },
    {
        cmd: 'env',
        description: 'Display environment variables. If key is provided, shows specific variable',
        args: [
            {
                name: 'key',
                type: 'string',
                description: 'Variable name'
            }
        ],
        permission: 'user'
    },
    {
        cmd: 'help',
        description: 'Display this help message',
        args: [{
            name: 'command',
            type: 'string',
            description: 'Command name'
        }],
        permission: 'any'
    },
    {
        cmd: 'clear',
        description: 'Clear the terminal',
        args: [],
        permission: 'any'
    },
    {
        cmd: 'exit',
        description: 'Close the terminal',
        args: [],
        permission: 'any'
    },
    {
        cmd: 'tags',
        description: 'List all your tags',
        args: [],
        permission: 'user'
    },
    {
        cmd: "tag",
        description: "Tag action",
        args: [
            {
                name: "create | project",
                type: "create | update | delete | project",
                description: "Action to perform"
            },
            {
                name: "ProjectName",
                type: "string",
                description: "Tag name"
            },
            {
                name: "tagName",
                type: "string",
                description: "Project name"
            },
            {
                name: "userCanUseThisTag",
                type: "boolean",
                description: "User can use this tag"
            }
        ],
        permission: 'admin'
    },
    {
        cmd: "set_admin",
        description: "Set user as admin",
        args: [
            {
                name: "email",
                type: "string",
                description: "User email"
            },
            {
                name: "password",
                type: "string",
                description: "User password"
            }
        ],
        permission: 'user'
    }
];

export default commands;