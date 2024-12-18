import React, { useEffect, useState, useCallback, useRef } from "react";
import type { JSX } from "react";
import initialFileSystem from "~/utils/structure/initialFileSystem";
import DirClass from "~/utils/structure/DirClass";
import FileClass from "~/utils/structure/FileClass";
import type { FileType, DirType, CmdHistory } from "~/utils/structure/types";
import type { Project } from '~/types/project';
import { getAccountClient, getProjects, getTags } from '~/lib/appwrite';
import type { Models } from "appwrite"; // Import Models for typing
import { useLoaderData, useNavigate } from '@remix-run/react';
import { MessageCircle, X } from 'lucide-react';
import commands from "~/utils/structure/cmdLists";

import axios from 'axios';
import GeistComponent from "./GeistComponent";
import { classNames } from '~/utils/classNames';

type TerminalProps = {
    onInteraction: () => void;
    expand?: string;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    showProjects: boolean;
    setShowProjects: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedProject: React.Dispatch<React.SetStateAction<Project | null>>;
    sendMszref: React.MutableRefObject<{
        sendMessage: (event: React.UIEvent | null, messageInput?: string) => void;
    }>;
    setIsCreateProject: React.Dispatch<React.SetStateAction<boolean>>;
};

const getRandomId = () => Math.random().toString(36).substring(7);
const Terminal: React.FC<TerminalProps> = ({
    onInteraction,
    expand,
    projects,
    setProjects,
    showProjects,
    setShowProjects,
    setSelectedProject,
    sendMszref,
    setIsCreateProject,
}) => {
    const createDirectoryFromJson = (json: DirType, parent: DirClass | null = null): DirClass => {
        const files = json.files.map(file => {
            return new FileClass(file.name, file.content, file.isSudo, file.permissions);
        });

        const dir = new DirClass(json.name, [], parent, json.isSudo, files, json.permissions);
        dir.dir = json.children.map(child => createDirectoryFromJson(child, dir)); // Set the current directory as parent

        return dir;
    };
    const root = createDirectoryFromJson(initialFileSystem);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [currentDir, setCurrentDir] = useState<DirClass>(root);
    const [cmd, setCmd] = useState<string>('');
    const [history, setHistory] = useState<CmdHistory[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
        null,
    );
    const [env, setEnv] = useState<{ [key: string]: string }>({
        HOME: "/root",
        USER: "",
        PATH: "/fast/code:/bin",
    })
    const [hoverText, setHoverText] = useState<string>('');
    const [providerKeys, setProviderKeys] = useState<{ [key: string]: string }>({});
    const [showCreateBox, setShowCreateBox] = useState<boolean>(false);
    const navigate = useNavigate();

    const loadEntries = useCallback(async () => {
        // setProjects(await getProjects());
        const userData = await getAccountClient().get();
        setUser(userData);
        setEnv((prev) => ({
            ...prev,
            USER: userData.name || userData.email || "",
        }));
    }, []);


    const fetchUserPreferrences = useCallback(async () => {
        const preferrences = await getAccountClient().getPrefs();
        if (preferrences['providerKeys']) {
            try {
                const providerKeys = JSON.parse(preferrences['providerKeys']);
                console.log("providerKeys::", providerKeys);
                setEnv((prev) => ({
                    ...prev,
                    ...providerKeys
                }));
                setProviderKeys(providerKeys);
            } catch (error) {
                console.error('Error parsing providerKeys preferrence');
            }
        }
    }, [])

    const updateUserPreferrence = async ({
        providerKeys
    }: {
        providerKeys: { [key: string]: string }
    }) => {
        console.log("providerKeys::", providerKeys);
        const preferrences = await getAccountClient().getPrefs();
        const res = await getAccountClient().updatePrefs({
            ...preferrences,
            providerKeys: JSON.stringify(providerKeys)
        })
        return res;
    }

    useEffect(() => {
        loadEntries();
        fetchUserPreferrences();
        inputRef.current?.focus();
    }, []);

    const getDirPath = (dir: DirClass): string => {
        if (dir.name === 'root') {
            return '/root';
        }
        return `${getDirPath(dir.parent!)}/${dir.name}`;
    }

    const handleTabCompletion = () => {
        const [command, ...args] = cmd.split(' ');
        if (args.length === 0) {
            return;
        }

        const currentDirEntries = currentDir.ls().map(entry => entry.name);
        const matchingEntries = currentDirEntries.filter(entry =>
            entry.toLowerCase().startsWith(args[0].toLowerCase())
        );

        if (matchingEntries.length === 1) {
            setCmd(`${command} ${matchingEntries[0]}`);
        } else if (matchingEntries.length > 1) {
            printLine([<div>{matchingEntries.join('  ')}</div>], cmd);
        }
    }

    const printLine = (output: JSX.Element[], cmd?: string) => {
        console.log("printLine output::", output);
        console.log("printLine cmd::", cmd);
        const outputId = getRandomId();
        const newHistory = [...history];
        console.log("newHistory::", newHistory);
        const outputObjs: { outputId: string; jsxs: JSX.Element }[] = []

        output.forEach((output) => {
            outputObjs.push({
                outputId: outputId,
                jsxs: output
            })
        })
        if (cmd) {
            newHistory.push({
                historyId: getRandomId(),
                cmd: cmd,
                dir: currentDir,
                output: outputObjs
            });
        } else {
            // Make sure there's existing history before trying to append
            if (newHistory.length > 0) {
                const lastEntry = newHistory[newHistory.length - 1];
                lastEntry.output = [...lastEntry.output, ...outputObjs];
                newHistory[newHistory.length - 1] = lastEntry;
                console.log("newHistory::", newHistory);
            }
        }
        console.log("newHistoryupdated::", newHistory);
        setHistory(newHistory);
        return outputObjs;
    }


    const typeCmd = (cmd: string, dntRun?: boolean) => {
        setHoverText('');
        let i = 0;
        const interval = setInterval(() => {
            const newCmd = cmd.slice(0, i);
            setCmd(newCmd);
            i++;
            if (i > cmd.length) {
                clearInterval(interval);
                const intervalCmd = setInterval(() => {
                    if (!dntRun) handleEnterCmd(cmd);
                    clearInterval(intervalCmd);
                }, 800);
            }
        }, 80);
    }

    useEffect(() => {
        // on load
        typeCmd('ls');
    }, []);

    const getPermission = async (cmd: string) => {
        try {

            const user = await getAccountClient().get();
            const command = commands.find(c => c.cmd === cmd.split(' ')[0]);
            // if this shows up, it means the command is not in the cmdLists.ts
            if (!command) {
                printLine([<div>Command not found in cmd List</div>], cmd);
                return false;
            }

            const permission = command.permission;
            if (permission === 'any') {
                return true;
            } else if (permission === 'user' && user) {
                return true;
            } else if (permission === 'admin' && user && user?.labels?.includes('admin')) {
                return true;
            } else if (permission === 'user' && !user) {
                printLine([
                    <div>Not logged in</div>,
                    <div>
                        <button
                            onClick={() => typeCmd("login")}
                            onMouseLeave={() => setHoverText('')}
                            onMouseEnter={() => setHoverText('login')}
                        >login </button>
                        - log in to your account
                    </div>,
                ], cmd);
                return false;
            } else if (permission === 'admin' && user && !user.labels?.includes('admin')) {
                printLine([
                    <div>Not an admin</div>,
                ], cmd);
                return false;
            } else if (permission === 'admin' && !user) {
                printLine([
                    <div>Not an admin</div>,
                ], cmd);
                return false;
            }
        } catch (error) {
            console.error("Error getting user", error);
            printLine([<div>Not logged in</div>,
            <div>
                <button
                    onClick={() => typeCmd("login")}
                    onMouseLeave={() => setHoverText('')}
                    onMouseEnter={() => setHoverText('login')}
                >login </button>
                - log in to your account
            </div>], cmd);
            return false;
        }

    }

    const checkApiKeyExist = async () => {

        // if OpenAI key is not set in env, show a message to set the key
        console.log("providerKeys::", providerKeys);
        if (!providerKeys['OpenAI']) {
            printLine([
                <div>
                    OpenAI API key not set
                </div>,
                <div>
                    <button
                        onClick={() => typeCmd("set OpenAI [your-key]", true)}
                        onMouseEnter={() => setHoverText('set OpenAI [your-key]')}
                        onMouseLeave={() => setHoverText('')}
                    >set OpenAI [your-key]</button>
                    - set your OpenAI API key
                </div>,
            ], cmd);
            return false;
        } else {
            return true;
        }
    }

    const projectsCmd = async (cmd: string) => {
        printLine([<div>
            Geting projects...
        </div>], cmd);
        const permission = await getPermission(cmd);
        if (!permission) {
            return;
        }
        try {
            const myProjects = await getProjects();
            setProjects(myProjects);
            setShowProjects(true);
            if (myProjects.length === 0) {
                printLine([<div>No projects found</div>], cmd);
            } else {
                const jsxs: JSX.Element[] = []
                myProjects.map((project) => {
                    let name = project.name;
                    // if name has spaces, add \ before space
                    if (name.includes(" ")) {
                        name = name.replace(/ /g, "\\ ");
                    }
                    jsxs.push(
                        <div key={getRandomId()}>
                            <button
                                onClick={() => {
                                    typeCmd(`start ${name}`);
                                }}
                                onMouseEnter={() => setHoverText(`start ${name}`)}
                                onMouseLeave={() => setHoverText('')}
                            >
                                {name}
                            </button>
                        </div>
                    );
                })
                printLine(jsxs, cmd);
            }
        } catch (error) {
            printLine([<div>{(error as Error).message}</div>], cmd);
        }
    }

    function combineArgs(args: string[], startIndex: number): string {
        // Initialize an empty string to hold the combined result
        let combined = '';

        // Iterate through the array starting from the specified index
        for (let i = startIndex; i < args.length; i++) {
            // Remove any escape characters 
            args[i] = args[i].replace(/\\/g, '');

            // Concatenate the words with a space if it's not empty
            combined += (combined ? ' ' : '') + args[i];
        }

        return combined;
    }

    const startProject = async (args: string[], cmd: string) => {
        const permission = await getPermission(cmd);
        if (!permission) {
            return;
        }
        if (args.length < 1) {
            printLine([<div>Usage: start [project-name]</div>], cmd);
            return;
        }
        printLine([<div>Starting project...</div>], cmd);
        const projectName = combineArgs(args, 0);
        const myProjects = await getProjects();
        if (myProjects && myProjects.length > 0) {
            const project = myProjects.find(p => p.name === projectName);
            if (project) {
                console.log("project::::", project);
                // add a searchParam "id" to the URL by useNavigate
                navigate(`/home?id=${project.repositoryName}`, { replace: true });
                printLine([<div>Loading project {projectName}</div>], cmd);
                setTimeout(() => {
                    printLine([<div>Starting project {projectName}</div>], cmd);
                    setShowProjects(false);
                    setSelectedProject(project);
                }, 10000);
            } else {
                printLine([<div>Project not found</div>], cmd);
            }
        } else {
            printLine([<div>
                Projects not loaded.
                Run <button
                    onClick={() => typeCmd("projects")}
                    className="ml-4 mr-2"
                    onMouseEnter={() => setHoverText('projects')}
                    onMouseLeave={() => setHoverText('')}
                >projects</button> to load projects.
            </div>], cmd);
        }
    }

    const createProject = async (args: string[], cmd: string) => {
        printLine([<div>
            Checking credentials...
        </div>], cmd);
        const permission = await getPermission(cmd);
        if (!permission) {
            return;
        }
        const isExist = await checkApiKeyExist();
        if (!isExist) return;

        setShowProjects(false);
        if (args.length < 1) {
            setShowCreateBox(true);
            textareaRef.current?.focus();
            printLine([<div>
                Type the description of the project you want to create
            </div>], cmd);
            return;
        }


        const prompt = args.join(" ");
        const id = args.join("-");

        // sendMszref.current.sendMessage(null, `create ${prompt}`);
        console.log("window.location::", window.location);
        try {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("create", prompt);
            // newUrl.searchParams.set("id", id);

            // Extracting only pathname and search (query) to pass to navigate
            const relativePath = "/home" + newUrl.search;
            console.log("Navigating to:", relativePath);
            navigate(relativePath, { replace: true });

            printLine([<div>
                Initialzing project '{prompt}'...
            </div>], cmd);

            setTimeout(() => {
                setIsCreateProject(true);
                printLine([<div>
                    Creating project '{prompt}'...
                </div>], cmd);
            }, 10000);
        } catch (error) {
            console.error("Error creating new URL or navigating:", error);
            printLine([<div>Error creating project</div>], cmd);
        }
    }

    const login = async (args: string[], cmd: string) => {
        if (args.length < 2) {
            printLine([
                <div>Usage: login [email] [password]</div>,
                <div>
                    <button
                        onClick={() => typeCmd("register")}
                        onMouseEnter={() => setHoverText('register')}
                        onMouseLeave={() => setHoverText('')}
                    >
                        register
                    </button>{" "}to create an account
                </div>
            ], cmd);
            return;
        }

        printLine([<div>Logging in...</div>], cmd);

        const [email, password] = args;
        console.log("email", email);
        console.log("password", password);
        try {
            const session = await getAccountClient().createEmailPasswordSession(
                email,
                password
            );
            console.log(session);

            setUser(await getAccountClient().get());
            printLine([<div>Logged in as {email}</div>], cmd);
        } catch (error) {
            printLine([<div>{(error as Error).message}</div>], cmd);
        }
    }

    const register = async (args: string[], cmd: string) => {
        if (args.length < 3) {
            printLine([
                <div>Usage: register [username] [email] [password]</div>,
                <div>
                    <button
                        onClick={() => typeCmd("login")}
                        onMouseEnter={() => setHoverText('login')}
                        onMouseLeave={() => setHoverText('')}
                    >
                        login
                    </button>{" "}
                    to login to your account
                </div>
            ], cmd);
            return;
        }

        const [username, email, password] = args;
        console.log("email", email);
        console.log("password", password);
        printLine([
            <div>
                Creating account for {username} ({email})...
            </div>
        ], cmd);

        try {
            await axios.post(
                `/api/register`,
                {
                    email,
                    password,
                    name: username
                }
            )
            printLine([
                <div>Account created successfully</div>,
                <div>
                    <button
                        onClick={() => typeCmd("login")}
                        onMouseEnter={() => setHoverText('login')}
                        onMouseLeave={() => setHoverText('')}
                    >
                        login
                    </button>
                    to login to your account
                </div>
            ], cmd);
        } catch (error: any) {
            if (error.response && error.response.data && error.response.data.message) {
                printLine([<div>{error.response.data.message}</div>], cmd);
            } else {
                // return setRegistrationError(`An unknown error occurred while creating your account`);
                printLine([<div>An unknown error occurred while creating your account</div>], cmd);
            }
        }
    }

    const logout = async () => {
        const permission = await getPermission('logout');
        if (!permission) {
            return;
        }
        try {
            await getAccountClient().deleteSession('current');
            printLine([<div>Logging out...</div>], cmd);
            setTimeout(() => {
                // reload the page to clear the session
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.log("error deleting current user session", error);
            printLine([<div>error deleting current user session</div>], cmd);
        }
    }

    const setEnvCmd = async (args: string[]) => {
        console.log("setEnv", args);
        if (args.length < 2) {
            printLine([<div>Usage: set [key] [value]</div>], cmd);
            return;
        }
        const [key, value] = args;
        setEnv((prev) => ({
            ...prev,
            [key]: value
        }));
        updateUserPreferrence({
            providerKeys: {
                ...providerKeys,
                [key]: value
            }
        });
        printLine([<div>{key}={value}</div>], cmd);
    }

    const envCmd = async (args: string[]) => {
        if (args.length < 1) {
            // print all env variables
            printLine([<div>{Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n')}</div>], cmd);
            return;
        }
        const key = args[0];
        printLine([<div>{key}={env[key]}</div>], cmd);
    }

    const helpCmd = async (args: string[]) => {
        if (args.length > 0) {
            // Show help for specific command
            const command = commands.find(cmd => cmd.cmd.split(' ')[0] === args[0]);

            if (command) {
                const permission = command.permission;



                const fullCmd = command.cmd + (
                    command.args.length > 0
                        ? ` ${command.args.map(arg => `[${arg.name}]`).join(' ')}`
                        : ''
                );
                printLine([
                    <div key={getRandomId()}>
                        <div className="font-bold">{fullCmd}</div>
                        <div>{command.description}</div>

                    </div>
                ], cmd);
            } else {
                printLine([<div>Command not found. Type 'help' to see all available commands.</div>], cmd);
            }
            return;
        }

        const jsxs: JSX.Element[] = []
        commands.forEach((command) => {
            const fullCmd = command.cmd + (
                command.args.length > 0
                    ? ` ${command.args.map(arg => `[${arg.name}]`).join(' ')}`
                    : ''
            );
            jsxs.push(
                <div key={getRandomId()}>
                    <button
                        onClick={() => typeCmd(`${command.cmd}`, false)}
                        onMouseEnter={() => setHoverText(`${command.cmd}`)}
                    >{fullCmd}</button>
                    <span className="ml-4">{command.description}</span>
                </div>
            )
        })
        printLine(jsxs, 'help');
    };

    const getTagsData = async () => {
        try {
            printLine([<div>Getting tags...</div>], 'tags');
            const tags = await getTags();

            if (tags.length === 0) {
                printLine([<div>No tags found</div>], 'tags');
                return [];
            }

            const tagsJsx: JSX.Element[] = [];
            tags.forEach((tag) => {
                tagsJsx.push(
                    <div key={getRandomId()} className="text-left">
                        {tag.name}
                    </div>
                );
            });

            printLine(tagsJsx, 'tags');

        } catch (error) {
            console.error("Error getting tags", error);
            return [];
        }
    }

    const createTag = async (args: string[], cmd: string) => {
        const permission = await getPermission(cmd);
        if (!permission) {
            return;
        }
        if (args.length < 1) {
            printLine([<div>Usage: create_tag [tag-name]</div>], cmd);
            return;
        }
        const tagName = args[0];

        const userCanUseThisTag = args[1] === 'true' ? true : false;
        printLine([<div>Creating tag {tagName}...</div>], cmd);
        try {
            if (!user) {
                printLine([<div>Not logged in</div>], cmd);
                return;
            }
            const authToken = (await getAccountClient().createJWT()).jwt;
            await axios.post(
                `/api/tags`,
                {
                    name: tagName,
                    userCanUseThisTag: userCanUseThisTag
                },
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`
                    },
                }
            )
            // sendMszref.current.sendMessage(null, `create_tag ${tagName}`);
            printLine([<div>Tag {tagName} created successfully</div>], cmd);
        } catch (error) {
            printLine([<div>{(error as Error).message}</div>], cmd);
        }
    }

    const tagProject = async (args: string[], cmd: string) => {
        const permission = await getPermission(cmd);
        if (!permission) {
            return;
        }
        if (args.length < 2) {
            printLine([<div>Usage: tag_project [project-name] [tag-name]</div>], cmd);
            return;
        }
        const [projectName, tagName] = args;
        printLine([<div>Tagging project {projectName} with {tagName}...</div>], cmd);
        try {
            if (!user) {
                printLine([<div>Not logged in</div>], cmd);
                return;
            }

            const thisProject = projects.find(p => p.name === projectName);

            if (!thisProject) {
                printLine([<div>Project not found</div>], cmd);
                return;
            }

            await axios.post(
                `/api/tag_project`,
                {
                    projectId: thisProject?.$id,
                    tagName,
                    userId: user?.$id
                }
            )
            // sendMszref.current.sendMessage(null, `tag_project ${projectName} ${tagName}`);
            printLine([<div>Project {projectName} tagged with {tagName} successfully</div>], cmd);
        } catch (error) {
            printLine([<div>{(error as Error).message}</div>], cmd);
        }
    }


    const setAdmin = async (args: string[], cmd: string) => {
        if (!user) {
            printLine([<div>Not logged in</div>], cmd);
            return;
        }
        if (args.length < 2) {
            printLine([<div>Usage: set_admin [email] [admin-pass]</div>], cmd);
            return;
        }

        const [email, adminPass] = args;

        printLine([<div>Setting admin for {email}...</div>], cmd);
        try {
            const res = await axios.post(
                `/api/set_admin`,
                {
                    email,
                    adminPass
                }
            )

            console.log("res::", res);
            // sendMszref.current.sendMessage(null, `set_admin ${email} ${adminPass}`);
            printLine([<div>Admin set for {email} successfully</div>], cmd);
        } catch (error) {
            printLine([<div>{(error as Error).message}</div>], cmd);
        }
    }

    const handleEnterCmd = (cmd: string) => {
        const [command, ...args] = cmd.split(' ');
        console.log('command', command);

        switch (command) {
            case 'ls':
                console.log('ls');
                console.log(currentDir.ls());
                printLine([
                    <>
                        {currentDir.ls().map((item) => {
                            return <button
                                key={getRandomId()}
                                onClick={() => {
                                    if (item.isDir) {
                                        typeCmd(`cd ${item.name}`)
                                    } else {
                                        typeCmd(`cat ${item.name}`)
                                    }
                                }}
                                onMouseEnter={() => setHoverText(item.isDir ? `cd ${item.name}` : `cat ${item.name}`)}
                                onMouseLeave={() => setHoverText('')}
                                className={"text-left " + (item.isDir ? "font-medium" : "")}
                            >{item.name}{" "}</button>
                        })}
                    </>
                ], cmd);
                break;

            case 'cd':
                if (args[0] === '..') {
                    if (currentDir.parent) {
                        setCurrentDir(currentDir.parent);
                        console.log('Changed directory to', currentDir.parent.name);
                        printLine([<p key={getRandomId()}>Changed directory to {currentDir.parent.name}</p>], cmd);
                    } else {
                        console.log('Already in root directory');
                        printLine([<p key={getRandomId()}>Already in root directory</p>], cmd);
                    }
                } else if (args[0] === '/') {
                    setCurrentDir(root);
                    console.log('Changed directory to root');
                    printLine([<p key={getRandomId()}>Changed directory to root</p>], cmd);
                } else if (args[0] === '~') {
                    setCurrentDir(root);
                    console.log('Changed directory to root');
                    printLine([<p key={getRandomId()}>Changed directory to root</p>], cmd);
                } else if (args[0]) {
                    const newDir = currentDir.cd(args[0]);
                    if (newDir) {
                        setCurrentDir(newDir);
                        console.log('Changed directory to', newDir.name);
                        printLine([<p key={getRandomId()}>Changed directory to {newDir.name}</p>], cmd);
                    } else {
                        console.log('Directory not found');
                        printLine([<p key={getRandomId()}>Directory not found</p>], cmd);
                    }
                } else {
                    setCurrentDir(root);
                    console.log('Changed directory to root');
                    printLine([<p key={getRandomId()}>Changed directory to root</p>], cmd);
                }
                break;

            case 'mkdir':
                currentDir.mkdir(args[0]);
                printLine([<p key={getRandomId()}>Directory {args[0]} created</p>], cmd);
                break;

            case 'touch':
                currentDir.touch(args[0], args[1], args[2]);
                printLine([<p key={getRandomId()}>File {args[0]} created</p>], cmd);
                break;

            case 'rm':
                currentDir.rm(args[0]);
                printLine([<p key={getRandomId()}>{args[0]} removed</p>], cmd);
                break;

            case 'cat':
                const content = currentDir.cat(args[0]);
                printLine([<p key={getRandomId()}>{content}</p>], cmd);
                break;

            case 'projects':
                projectsCmd(cmd);
                break;

            case 'start':
                startProject(args, cmd);
                break;

            case 'create':
                createProject(args, cmd);
                break;

            case 'login':
                login(args, cmd);
                break;

            case 'register':
                register(args, cmd);
                break;

            case 'logout':
                logout();
                break;

            case 'set':
                setEnvCmd(args);
                break;

            case 'env':
                envCmd(args);
                break;

            case 'help':
                helpCmd(args);
                break;

            case 'clear':
                setHistory([]);
                break;

            case 'exit':
                // go to home page
                setShowProjects(false);
                setIsCreateProject(false);
                setSelectedProject(null);
                navigate('/home');
                break;

            case 'tag':
                const subCommand = args[0];

                switch (subCommand) {
                    case 'create':
                        createTag(args.slice(1), cmd);
                        break;

                    case 'project':
                        tagProject(args.slice(1), cmd);
                        break;

                    default:
                        printLine([<div>
                            Subcommand not found. Type {" "}
                            <button
                                onClick={() => typeCmd("help tag")}
                                onMouseEnter={() => setHoverText('help tag')}
                                onMouseLeave={() => setHoverText('')}
                            >
                                help tag
                            </button> {" "}
                            to see all available subcommands.
                        </div>], cmd);
                        break;
                }
                break;

            case 'tags':
                getTagsData();
                break;

            case 'set_admin':
                setAdmin(args, cmd);
                break;



            default:
                printLine([<p key={getRandomId()}>
                    Command not found. Type
                    <button
                        className="ml-4 mr-2"
                        onClick={() => typeCmd("help")}
                        onMouseEnter={() => setHoverText('help')}
                        onMouseLeave={() => setHoverText('')}
                    >help</button>
                    to see all available commands.</p>
                ], cmd);
                break;

        }

        setCmd('');
    }


    const onEnterCmd = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const cmd = e.currentTarget.value;

        let newCmd = cmd;
        if (showCreateBox) {
            // if cmd doesnot starts with create, then add the create text
            setShowCreateBox(false);
            if (!cmd.startsWith("create")) {
                newCmd = `create ${cmd}`;
            } else {
                newCmd = cmd;
            }
        }
        if (e.key === 'Enter') {
            handleEnterCmd(newCmd);
        }
    }


    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history]);


    const inputLvl = `${user ? (user.name || user.email) + "~" : ""} ${getDirPath(currentDir)} $`

    return (
        <div
            className="h-screen w-screen"
        >
            <div
                className="terminal"
                style={{
                    padding: "1.5em",
                    fontSize: "1.35em",
                    fontWeight: 280,
                    fontFamily: "sans-serif",
                }}
            >
                <div
                    className="flex flex-col"
                >
                    {history.map((cmdHistory, index) => {
                        return (
                            <div
                                className="flex flex-col"
                                key={index}
                            >
                                <div
                                    className="flex flex-row gap-2"
                                >
                                    <span
                                    >
                                        {getDirPath(cmdHistory.dir)} $
                                    </span> {" "}
                                    {cmdHistory.cmd}
                                </div>
                                {cmdHistory.output.map((output, index2) => {
                                    return (
                                        <div
                                            key={index2}
                                            className="typedLine flex flex-col items-start"
                                        >
                                            {output.jsxs}
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
                <div
                    className={"relative flex  " + (showCreateBox ? "flex-col" : "flex-row align-center items-center ")}
                    onClick={() => {
                        inputRef.current?.focus();
                        setHoverText('');
                    }}
                >
                    <span
                        className="cmd"
                    >
                        {inputLvl}
                    </span>
                    {showCreateBox ? (<>
                        <div
                            className={classNames(
                                'shadow-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background backdrop-filter backdrop-blur-[8px] rounded-lg overflow-hidden transition-all',
                            )}
                        >
                            <textarea
                                className={`w-full pl-4 pt-4 pr-16 focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus resize-none text-md text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent transition-all`}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Tab') {
                                        handleTabCompletion();
                                    } else if (e.key === 'Enter') {
                                        onEnterCmd(e);
                                    }
                                }}
                                ref={textareaRef}
                                value={cmd}
                                onChange={(e) => setCmd(e.target.value)}
                                // style={{
                                //     minHeight: TEXTAREA_MIN_HEIGHT,
                                //     maxHeight: TEXTAREA_MAX_HEIGHT,
                                // }}
                                placeholder="How can Fastcode help you today?"
                                translate="no"
                            />
                            <div>
                                <X
                                    className="absolute right-2 top-2 cursor-pointer"
                                    onClick={() => setShowCreateBox(false)}
                                />
                            </div>
                        </div>
                    </>) : (
                        <>
                            <input
                                type="text"
                                placeholder="Type 'help' for a list of commands"
                                className={"inputText" + (hoverText ? " opacity-0" : "")}
                                value={cmd}
                                ref={inputRef}
                                onChange={(e) => setCmd(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Tab') {
                                        handleTabCompletion();
                                        inputRef.current?.focus();
                                    } else if (e.key === 'Enter') {
                                        onEnterCmd(e);
                                    } else if (e.key === 'ArrowUp') {
                                        const newHistory = [...history];
                                        if (newHistory.length > 0) {
                                            setCmd(newHistory[newHistory.length - 1].cmd);
                                        }
                                    } else if (e.key === 'ArrowDown') {
                                        setCmd('');
                                    }
                                }}
                                autoComplete="off"
                                autoCapitalize="off"
                                autoCorrect="off"
                                spellCheck="false"
                                size={cmd.length}
                                style={{
                                    marginLeft: "0.5em",
                                    width: `${(cmd.length > 0 || hoverText.length > 0)
                                        ? (cmd.length || hoverText.length)
                                        : 30}ch`,
                                }}
                            />
                            <span
                                style={{
                                    position: "absolute",
                                    left: `${inputLvl.length - 2}ch`,
                                    opacity: 0.5,
                                }}
                            >
                                {hoverText}
                            </span>
                            <GeistComponent
                                mode={"waiting"}
                                onClick={() => {
                                    typeCmd('help')
                                }}
                                texts={cmd}
                            />
                        </>
                    )}
                </div>
                <div
                    id="bottom"
                    ref={bottomRef}
                ></div>
            </div>

            <div className="circle-container">
                <div className="circle" id="circle1"></div>
                <div className="circle" id="circle2"></div>
                <div className="circle" id="circle3"></div>
            </div>
        </div>
    );
}

export default Terminal;

