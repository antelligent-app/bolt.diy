import React, { useEffect, useState, useRef, useCallback } from "react";
import "../../styles/components/intro.scss";
import GeistComponent from "./GeistComponent";
import "../../styles/components/terminal.scss";
import { getAccountClient, getProjects } from '~/lib/appwrite';
import { useChat } from 'ai/react';
import { useLoaderData, useNavigate } from '@remix-run/react';
import type { Models } from "appwrite"; // Import Models for typing
import type { Project } from '~/types/project';
import axios from 'axios';
import { wopr, type Binary } from "~/utils/terminalBinaries";


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

type VFSNode = {
    type: string;
    auth: boolean;
    children?: { [key: string]: VFSNode };
    contents?: string;
    function?: (args: string[]) => void;
    completion?: (args: string[]) => string | undefined;
};

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
    const devDir = "/fast/code";

    const [inputText, setInputText] = useState<string>("");
    const [cwd, setCwd] = useState<string>(devDir);
    const [hoverText, setHoverText] = useState<string | undefined>(undefined);
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
        null,
    );
    const navigate = useNavigate();
    // const [loadFinished, setLoadFinished] = useState(false);
    const [env, setEnv] = useState<{ [key: string]: string }>({
        HOME: devDir,
        USER: "",
        PATH: "/fast/code:/bin",
    })

    const [providerKeys, setProviderKeys] = useState<{ [key: string]: string }>({});

    const loadEntries = useCallback(async () => {
        // setProjects(await getProjects());
        const userData = await getAccountClient().get();
        setUser(userData);
        setEnv((prev) => ({
            ...prev,
            USER: userData.name || userData.email || "",
        })
        );
    }, []);


    const fetchUserPreferrences = useCallback(async () => {
        const preferrences = await getAccountClient().getPrefs();
        if (preferrences['providerKeys']) {
            try {
                const providerKeys = JSON.parse(preferrences['providerKeys']);
                console.log("preferrences::", preferrences);
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
    }, []);

    const [terminalPrompt, setTerminalPrompt] = useState("");
    const promptDelimiter = " >";

    const [isMobile, setIsMobile] = useState(false);

    const availableBinaries: { [key: string]: Binary } = {
        wopr: wopr,
    };
    const [runningBinaryPrompt, setRunningBinaryPrompt] = useState<string>("");
    const [runningBinaryState, setRunningBinaryState] = useState<any>({});
    const [runningBinary, setRunningBinary] = useState<string | undefined>(
        undefined
    );

    useEffect(() => {
        const updateColor = () => {
            const currentTime = Math.floor(Date.now() / 1000); // seconds since 1970
            const hue = currentTime % 360;
            document.documentElement.style.setProperty("--hue", hue.toString());
        };
        updateColor();
        setInterval(updateColor, 1000);

        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768); // Common mobile breakpoint
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const tabComplete = (text: string) => {
        setGeistMode("autocompleting");

        let args = text.split(" ");
        let cmd = args[0];

        // Commands can provide their own completion logic
        let commandNode = commandNodeForPath(cmd);
        if (commandNode?.completion) {
            return setInputText(commandNode.completion(args) || text);
        }

        // Otherwise, we can complete based on the current directory and path items
        let lastItem = args.pop();
        for (const cmd of [
            ...Object.keys(nodeAtPath(cwd)?.children || {}),
            ...commandsInPath(),
        ]) {
            if (lastItem && cmd.startsWith(lastItem)) {
                args.push(cmd);
                return setInputText(args.join(" "));
            }
        }
    };

    // function joinArgsFromIndex(args: string[], startIndex: number) {
    //     // Join the elements from startIndex to the end of the array
    //     return args.slice(startIndex).join(' ').replace(/\\\"/g, '"');
    // }

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

    const missionLines = [
        <div>
            Modern AI will fundamentally change how people use software in their daily
            lives. Agentic applications could, for the first time, enable computers to
            work with people in much the same way people work with people.
        </div>,
        <br />,
        <div>
            But it won’t happen without removing a ton of blockers. We need new UI
            patterns, a reimagined privacy model, and a developer platform that makes
            it radically simpler to build useful agents. That’s the challenge we’re
            taking on.
        </div>,
        <br />,
    ];

    const readOnlyCmd = {
        type: "executable",
        auth: false,
        function: (args: string[]) => {
            printLines([<div>{args[0]}: filesystem is read-only</div>]);
        },
    };

    const whoamiLines = [
        <div>
            <button
                style={{ color: "var(--text-color)" }}
                onClick={() => typeCmd(`who geist`)}
            >
                geist
            </button>{" "}
            ttyv0 Oct 8, 18:54
        </div>,
    ];

    const showLogin = async () => {
        const user = await getAccountClient().get();
        if (!user) {
            printLines([
                <div>Not logged in</div>,
                <div>
                    <button onClick={() => typeCmd("login")}>login </button>
                    - log in to your account
                </div>,
            ]);
            return;
        }
    }

    const projectsCmd = {
        type: "executable",
        auth: true,
        function: async () => {
            showLogin();
            try {
                const myProjects = await getProjects();
                setProjects(myProjects);
                setShowProjects(true);
                if (myProjects.length === 0) {
                    printLines([<div>No projects found</div>]);
                } else {
                    myProjects.map((project) => {
                        let name = project.name;
                        // if name has spaces, add \ before space
                        if (name.includes(" ")) {
                            name = name.replace(/ /g, "\\ ");
                        }
                        printLines([
                            <button
                                key={project.$id}
                                className="project"
                                onClick={() => typeCmd(`start ${name}`)}
                            >
                                {`${name}`}
                            </button>
                        ])
                    })
                }
            } catch (error) {
                printLines([<div>{(error as Error).message}</div>]);
            }
        },
    }

    const login = {
        type: "executable",
        auth: false,
        function: async (args: string[]) => {
            if (args.length < 3) {
                printLines([
                    <div>Usage: login [email] [password]</div>,
                    <div>
                        <button
                            onClick={() => typeCmd("register")}
                        >
                            register
                        </button>{" "}to create an account
                    </div>
                ]);
                return;
            }

            const [, email, password] = args;
            console.log("email", email);
            console.log("password", password);
            try {
                const session = await getAccountClient().createEmailPasswordSession(
                    email,
                    password
                );
                console.log(session);

                setUser(await getAccountClient().get());
            } catch (error) {
                printLines([<div>{(error as Error).message}</div>]);
            }
        },
    }

    const register = {
        type: "executable",
        auth: false,
        function: async (args: string[]) => {
            if (args.length < 4) {
                printLines([
                    <div>Usage: register [username] [email] [password]</div>,
                    <div>
                        <button
                            onClick={() => typeCmd("login")}
                        >
                            login
                        </button>{" "}
                        to login to your account
                    </div>
                ]);
                return;
            }

            const [, username, email, password] = args;
            console.log("email", email);
            console.log("password", password);

            try {
                await axios.post(
                    `/api/register`,
                    {
                        email,
                        password,
                        name: username
                    }
                )
                printLines([
                    <div>Account created successfully</div>,
                    <div>
                        <button
                            onClick={() => typeCmd("login")}
                        >
                            login
                        </button>
                        to login to your account
                    </div>
                ]);
            } catch (error: any) {
                if (error.response && error.response.data && error.response.data.message) {
                    printLines([<div>{error.response.data.message}</div>]);
                } else {
                    // return setRegistrationError(`An unknown error occurred while creating your account`);
                    printLines([<div>An unknown error occurred while creating your account</div>]);
                }
            }
        },
    }

    const marketplace = {
        type: "executable",
        auth: false,
        function: (args: string[]) => {
            printLines([
                <div>
                    We are building a marketplace.
                </div>
            ]);
        }
    }

    const contact = {
        type: "executable",
        auth: false,
        function: (args: string[]) => {
            printLines([
                <div>
                    <span>
                        For any queries, contact
                    </span> {" "}
                    <a href="mailto:gaurav@antelligent.app">
                        Gaurav Gandhi
                    </a>
                </div>
            ]);
        }
    }


    /* 
        if loged in:
        create [project-name]
        develop [project-name]
        start [project-name]
        exit project
        profile
        whoami
        logout
    */

    /*
        if not loged in:
        login [email] [password]
        register [email] [password
        about
        marketplace
        contact
    */

    /*
        Any app can be public or private or shared with other users
        User can put app to marketplace
        User can share app with other users, without showing the code
        User can make it free or paid app
        
    */

    const vfs: VFSNode = {
        // root
        type: "directory",
        auth: false,
        children: {
            bin: {
                type: "directory",
                auth: false,
                children: {
                    ls: {
                        type: "executable",
                        auth: false,
                        function: (args: string[]) => {
                            var path = cwd;
                            if (args[1]) path = pathRelativeToPath(cwd, args[1]);
                            printLines(directoryListingForPath(path));
                        },
                    },

                    cat: {
                        type: "executable",
                        auth: false,
                        function: (args: string[]) => {
                            let path = pathRelativeToPath(cwd, args[1]);
                            let node = nodeAtPath(path);
                            if (!node) {
                                printLines([
                                    <div>cat: no such file or directory: {args[1]}</div>,
                                ]);
                            } else if (node?.contents) {
                                printLines([<div key="contents">{node.contents}</div>]);
                            } else if (node?.type === "executable") {
                                let code = node.function?.toString();
                                printLines(
                                    code
                                        ?.split("\n")
                                        .map((line) => <div key="code">{line}</div>) || []
                                );
                            }
                        },
                    },

                    help: {
                        type: "executable",
                        auth: false,
                        function: (args: string[]) => {
                            printLines(helpLines);
                        },
                    },

                    cd: {
                        type: "executable",
                        auth: false,
                        function: (args: string[]) => {
                            const dest = args[1];
                            let path = pathRelativeToPath(cwd, dest || env["HOME"]);
                            let node = nodeAtPath(path);
                            if (node?.type === "directory") {
                                setCwd(path);
                                setTerminalPrompt(path + promptDelimiter);
                            } else if (node) {
                                printLines([<div>cd: not a directory: {dest}</div>]);
                            } else {
                                printLines([<div>cd: no such file or directory: {dest}</div>]);
                            }
                        },
                    },

                    pwd: {
                        type: "executable",
                        auth: false,
                        function: (args: string[]) => {
                            printLines([<div key="binary">{cwd}</div>]);
                        },
                    },

                    echo: {
                        type: "executable",
                        auth: false,
                        function: (args: string[]) => {
                            let result = args.slice(1).join(" ");
                            // substitute variables from env
                            let replaced = result.replace(/\$(\w+)/g, (match, p1) => {
                                const key = p1.toUpperCase() as keyof typeof env;
                                return env[key] || match;
                            });
                            printLines([<div>{replaced}</div>]);
                        },
                    },

                    clear: {
                        type: "executable",
                        auth: false,

                        function: (args: string[]) => {
                            setLines([]);
                        },
                    },

                    rm: {
                        type: "executable",
                        auth: false,

                        function: (args: string[]) => {
                            if (args[1] === "-rf") {
                                document.body.innerHTML = "";
                                setTimeout(() => {
                                    window.close();
                                }, 1000);
                            } else {
                                printLines([<div>rm: filesystem is read-only</div>]);
                            }
                        },
                    },

                    whoami: {
                        type: "executable",
                        auth: false,

                        function: (args: string[]) => {
                            printLines(whoamiLines);
                        },
                    },

                    mv: readOnlyCmd,
                    mkdir: readOnlyCmd,
                    touch: readOnlyCmd,
                    chmod: readOnlyCmd,

                    sudo: {
                        type: "executable",
                        auth: true,
                        function: (args: string[]) => {
                            showLogin();
                            printLines(sudoLines);
                        },
                    },

                    env: {
                        type: "executable",
                        auth: true,
                        function: (args: string[]) => {
                            showLogin();
                            printLines(
                                Object.entries(env).map(([key, value]) => (
                                    <div>
                                        {key}={value}
                                    </div>
                                ))
                            );
                        },
                    },


                    logout: {
                        type: "executable",
                        auth: true,
                        function: async () => {
                            showLogin();
                            try {
                                await getAccountClient().deleteSession('current');
                                printLines([<div>Logging out...</div>]);
                                setTimeout(() => {
                                    // reload the page to clear the session
                                    window.location.reload();
                                }, 1000);
                            } catch (error) {
                                console.log("error deleting current user session", error);
                                printLines([<div>error deleting current user session</div>]);
                            }
                        },
                    },

                    login: login,

                    register: register,

                    // list of projects
                    projects: projectsCmd,

                    // create app 
                    create: {
                        type: "executable",
                        auth: true,
                        function: async (args: string[]) => {
                            showLogin();
                            if (args.length < 2) {
                                printLines([<div>Usage: create [project-name]</div>]);
                                return;
                            }
                            const prompt = args.slice(1).join(" ");
                            const id = args.slice(1).join("-");

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

                                printLines([<div>
                                    Initialzing project '{prompt}'...
                                </div>]);

                                setTimeout(() => {
                                    setIsCreateProject(true);
                                    printLines([<div>
                                        Creating project '{prompt}'...
                                    </div>]);
                                }, 10000);
                            } catch (error) {
                                console.error("Error creating new URL or navigating:", error);
                            }
                        },
                    },

                    develop: {
                        type: "executable",
                        auth: true,
                        function: async (args: string[]) => {
                            showLogin();
                            if (args.length < 2) {
                                printLines([<div>Usage: create [project-name]</div>]);
                                return;
                            }
                            const prompt = args.slice(1).join(" ");
                            const id = args.slice(1).join("-");

                            // sendMszref.current.sendMessage(null, `create ${prompt}`);
                            console.log("window.location::", window.location);
                            try {
                                const newUrl = new URL(window.location.href);
                                newUrl.searchParams.set("create", prompt);
                                const relativePath = "/" + newUrl.search;
                                navigate(relativePath, { replace: true });
                                printLines([<div>
                                    Developing project '{prompt}'...
                                </div>]);
                                setTimeout(() => {
                                    setIsCreateProject(true);
                                    printLines([<div>
                                        Development started for project '{prompt}'...
                                    </div>]);
                                }, 10000);
                            } catch (error) {
                                console.error("Error creating new URL or navigating:", error);
                            }
                        },
                    },

                    start: {
                        type: "executable",
                        auth: true,
                        function: async (args: string[]) => {
                            showLogin();
                            if (args.length < 2) {
                                printLines([<div>Usage: start [project-name]</div>]);
                                return;
                            }
                            const projectName = combineArgs(args, 1);
                            const myProjects = await getProjects();
                            if (myProjects && myProjects.length > 0) {
                                const project = myProjects.find(p => p.name === projectName);
                                if (project) {
                                    console.log("project::::", project);
                                    // add a searchParam "id" to the URL by useNavigate
                                    navigate(`/home?id=${project.repositoryName}`, { replace: true });
                                    printLines([<div>Loading project {projectName}</div>]);
                                    setTimeout(() => {
                                        printLines([<div>Starting project {projectName}</div>]);
                                        setShowProjects(false);
                                        setSelectedProject(project);
                                    }, 10000);
                                } else {
                                    printLines([<div>Project not found</div>]);
                                }
                            } else {
                                printLines([<div>
                                    Projects not loaded.
                                    Run <button
                                        onClick={() => typeCmd("projects")}
                                        className="ml-4 mr-2"
                                    >projects</button> to load projects.
                                </div>]);
                            }
                        },
                    },

                    exit: {
                        type: "executable",
                        auth: true,
                        function: async (args: string[]) => {
                            showLogin();
                            if (args.length < 2) {
                                navigate(`/`, { replace: true });
                                printLines([<div>Exiting...</div>]);
                                return;
                            } else {
                                if (args[1] === "project") {
                                    setShowProjects(false);
                                    setSelectedProject(null);
                                    // go to /home page by window 
                                    window.location.href = "/home";

                                    printLines([<div>Exiting project...</div>]);
                                    return;
                                }
                            }
                        },
                    },
                    set: {
                        type: "executable",
                        auth: true,
                        function: async (args: string[]) => {
                            showLogin();
                            if (args.length < 2) {
                                printLines([<div>Usage: set [key] [value]</div>]);
                                return;
                            }
                            const [key, value] = args.slice(1);
                            setEnv({
                                ...env,
                                [key]: value
                            });

                            updateUserPreferrence({
                                providerKeys: {
                                    ...providerKeys,
                                    [key]: value
                                }
                            });
                            printLines([<div>{key}={value}</div>]);
                        },
                    },
                },
            },

            fast: {
                type: "directory",
                auth: false,
                children: {
                    code: {
                        type: "directory",
                        auth: false,
                        children: {
                            login: login,
                            register: register,
                            about: {
                                type: "executable",
                                auth: false,
                                function: (args: string[]) => {
                                    printLines(missionLines);
                                },
                            },
                            marketplace: marketplace,
                            // who: {
                            //     type: "executable",
                            //     auth: false,
                            //     completion: (args: string[]) => {
                            //         let text = args.slice(1).join(" ");
                            //         let initial = args.pop() || "";
                            //         let match = people.find((person) =>
                            //             person.id.startsWith(initial)
                            //         );
                            //         if (match) {
                            //             return `${args[0]} ${match?.id || ""}`;
                            //         }
                            //         if (text.startsWith("a")) {
                            //             return `${args[0]} am i`;
                            //         }
                            //     },
                            //     function: (args: string[]) => {
                            //         let person = people.find((person) => person.id === args[1]);

                            //         if (args[1] === "am" && args[2] === "i") {
                            //             printLines(whoamiLines);
                            //         } else if (args.length === 1) {
                            //             printLines([...whoLines]);
                            //         } else if (person) {
                            //             if (person.shuffle) {
                            //                 if (!currentIndices.has(person.id)) {
                            //                     currentIndices.set(person.id, 0);
                            //                 }
                            //                 let index = currentIndices.get(person.id)!;
                            //                 printLinesScrambled(
                            //                     shuffledAbouts.get(person.id)!,
                            //                     index
                            //                 );
                            //                 currentIndices.set(
                            //                     person.id,
                            //                     (index + 1) % shuffledAbouts.get(person.id)!.length
                            //                 );
                            //             } else {
                            //                 printLines(person.about);
                            //             }
                            //         } else if (args[1] === "geist") {
                            //             printLines([<div>&nbsp;&nbsp;&nbsp;*&nbsp;*&nbsp;*<br /> *&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*<br />&nbsp;*&nbsp;&nbsp;|&nbsp;|&nbsp;&nbsp;*<br />&nbsp;*&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;*<br />&nbsp;*&nbsp;*&nbsp;*&nbsp;*</div>])
                            //         } else {
                            //             printLines(whoLines);
                            //         }
                            //     },
                            // },
                            projects: projectsCmd,
                            contact: contact
                        },
                    },
                },
            },
            private: {
                type: "directory",
                auth: false,
                children: {
                    code: {
                        type: "directory",
                        auth: false,
                        children: {
                            wopr: {
                                type: "executable",
                                auth: false,
                                function: (args: string[]) => {
                                    let binary = availableBinaries["wopr"];
                                    let result = binary("", { phase: "init" });
                                    setRunningBinary("wopr");
                                    setRunningBinaryState(result.newState);
                                    setRunningBinaryPrompt(result.prompt || "");
                                    let lines = result.output.map((line) => <div>{line}</div>);
                                    printLines(lines);
                                },
                            },
                        },
                    },
                },
            },
        },
    };

    const directoryListingForPath = (path: string) => {
        const directory = nodeAtPath(path);
        return Object.keys(directory?.children || {})
            .sort()
            .map((child) => {
                let node = directory?.children?.[child];
                if (node?.type === "executable") {
                    return (
                        <button
                            className="executable"
                            onClick={() => typeCmd(`${child}`)}
                            onMouseOver={() => setHoverText(child)}
                            onMouseOut={() => setHoverText(undefined)}
                        >
                            {child}
                        </button>
                    );
                } else if (node?.type === "directory") {
                    let cmd = `cd ${child}`;
                    return (
                        <button
                            className="directory"
                            onClick={() => typeCmd(cmd)}
                            onMouseOver={() => setHoverText(cmd)}
                            onMouseOut={() => setHoverText(undefined)}
                        >
                            {child}/
                        </button>
                    );
                } else {
                    return <div>{child}</div>;
                }
            });
    };

    const nodeAtPath = (path: string) => {
        // relative path
        const absPath = pathRelativeToPath(cwd, path);
        const pathParts = absPath.split("/").filter(Boolean);
        let directory: VFSNode = vfs;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (directory.children && directory.children[part]) {
                directory = directory.children[part];
            } else {
                return undefined;
            }
        }
        return directory;
    };

    const pathRelativeToPath = (base: string, to: string) => {
        const baseParts = base.split("/");
        const toParts = to.split("/");
        if (baseParts[1] === "") {
            // root path
            baseParts.pop();
        }
        if (toParts[0] === "") {
            // absolute path
            return to;
        }
        if (toParts[0] === ".") {
            // relative path
            toParts.shift();
        } else if (toParts[0] === "..") {
            // parent path
            baseParts.pop();
            toParts.shift();
        }
        let components = [...baseParts, ...toParts];
        let path = components.join("/");
        if (path.length === 0) {
            return "/";
        }
        return components.join("/");
    };



    const randoSlice = () => {
        var sandoSlices = [
            <div>WWwWWW\_/WW</div>,
            <div>MM\_/wMMMMM</div>,
            <div>$%$%$%$%$$%</div>,
            <div>^V^v^vV^v^V</div>,
            <></>,
        ];
        return sandoSlices[Math.floor(Math.random() * sandoSlices.length)];
    };

    const sudoLines = [
        <div>sudo: superuser unavailable</div>,
        <div>but I made you a sandwich</div>,
        <br />,
        <div> ____|____</div>,
        <div>/_________\</div>,
        randoSlice(),
        <div>{"{'_.-.-'-.}"}</div>,
        randoSlice(),
        <div>\_________/</div>,
    ];



    const helpLines = [
        <button onClick={() => typeCmd("register")}>
            register - create a new user account
        </button>,
        <button onClick={() => typeCmd("login")}>login - log in to your account</button>,
        <button onClick={() => typeCmd("logout")}>logout - log out of your account</button>,
        <button onClick={() => typeCmd("ls")}>ls - list directory contents</button>,
        <button onClick={() => typeCmd("about")}>about - print about</button>,
        <button onClick={() => typeCmd("jobs")}>jobs - print jobs</button>,
        <button onClick={() => typeCmd("clear")}>clear - clear the screen</button>,
    ];

    const promptLine = (cwd: string, line: string) => (
        <p className="old-prompt">
            <span>
                <span>
                    {cwd} &gt; {line}
                </span>
                <br />
            </span>
        </p>
    );

    const didYouMean = (line: string) => {
        return [
            <div>
                did you mean:{" "}
                <button onClick={() => typeCmd(`who ${line}`)}>who {line}</button>
            </div>,
        ];
    };

    const commandNodeForPath = (path: string) => {
        var node = nodeAtPath(path);
        if (node) {
            return node;
        }
        const binPaths = env["PATH"].split(":");
        for (const binPath of binPaths) {
            const cmdNode = nodeAtPath(`${binPath}/${path}`);
            if (cmdNode) {
                return cmdNode;
            }
        }
        return undefined;
    };

    const commandsInPath = () => {
        const binPaths = env["PATH"].split(":");
        let commands = [];
        for (const binPath of binPaths) {
            const binNode = nodeAtPath(binPath);
            if (binNode) {
                let children = Object.keys(binNode.children || {});
                commands.push(...children);
            }
        }
        return commands;
    };

    const handleInput = (line: string) => {
        // Echo the command
        if (runningBinary === undefined) {
            printLines([promptLine(cwd, line)]);
        }
        setInputText("");
        line = line.trim();

        let args = line.split(" ");
        let cmd = args[0];

        if (runningBinary !== undefined) {
            let binary = availableBinaries[runningBinary];
            let result = binary(line, runningBinaryState, (results: string[]) => {
                let jsx = results.map((line) => <div>{line}</div>);
                printLines(jsx);
                for (line of results) {
                    if (line.indexOf("ERROR: LINK DISCONNECTED") >= 0) {
                        setRunningBinary(undefined);
                        setRunningBinaryState(undefined);
                        setRunningBinaryPrompt("");
                    }
                }
            });
            let jsx = result.output.map((line) => <div>{line}</div>);
            printLines(jsx);
            setRunningBinaryState(result.newState);
            setRunningBinaryPrompt(result.prompt || "");
            if (result.exitStatus !== 0) {
                setRunningBinary(undefined);
                setRunningBinaryState(undefined);
                setRunningBinaryPrompt("");
            }
        } else if (cmd) {
            var cmdNode = commandNodeForPath(cmd);
            console.log(">", line);
            if (cmdNode && cmdNode.type === "executable" && cmdNode.function) {
                cmdNode.function(args);
            } else {
                printLines([
                    <div key="fastcode">fastcode: command not found: {line}</div>,
                    ...didYouMean(line),
                ]);
            }
        } else {
            printLines([]);
        }
    };

    const typingSpeed = 30;
    const typeCmd = (text: string) => {
        (document.activeElement as HTMLElement).blur();
        scrollToBottom();

        setInputText("");
        setGeistMode("autocompleting");

        let chars = text.split("");

        const typeChar = () => {
            if (chars.length > 0) {
                let char = chars.shift();
                let delay = typingSpeed * (1 + Math.random());
                if (char === " ") {
                    delay *= 4;
                }
                setInputText((inputText) => inputText + char);
                setTimeout(typeChar, delay);
            } else {
                setTimeout(() => {
                    handleInput(text);
                    setInputText("");
                    setGeistMode("waiting");
                }, typingSpeed * 8);
            }
        };

        setTimeout(typeChar, 0);
    };

    const motd = [
        <span>We’re building the</span>,
        <span>next-gen operating system</span>,
        <span>for AI agents.</span>,
        <span>
            Type
            <button
                onClick={() => typeCmd("help")}
                className="ml-4 mr-2"
            >
                help
            </button>
            for more info.
        </span>
    ];

    const printLines = (newLines: JSX.Element[]) => {
        setGeistMode("outputting");
        const linesWithSpacing = newLines;

        linesWithSpacing.forEach((line, index) => {
            setTimeout(() => {
                setLines((lines) => [...lines, line]);
                if (index === linesWithSpacing.length - 1) {
                    setGeistMode("waiting");
                }
                // scroll page to bottom
            }, index * 81);
        });
    };

    const getVisibleText = (element: React.ReactNode): string => {
        if (typeof element === "string" || typeof element === "number") {
            return element.toString();
        }

        if (Array.isArray(element)) {
            return element.map(getVisibleText).join(" ");
        }

        if (React.isValidElement(element)) {
            const children = element.props.children;
            return getVisibleText(children);
        }

        return "";
    };

    const scrambleLine = (
        lineChoices: JSX.Element[],
        choice: number,
        chance: number
    ) => {
        const textOnlyLines = lineChoices.map((line) => getVisibleText(line));
        const chosenLine = textOnlyLines[choice];
        const otherLines = textOnlyLines.filter((_, i) => i !== choice);

        let line = "";
        for (let i = 0; i < chosenLine.length; i++) {
            if (Math.random() < chance) {
                line += chosenLine[i];
            } else {
                line +=
                    otherLines[Math.floor(Math.random() * otherLines.length)][i] || " ";
            }
        }
        return <div>{line}</div>;
    };

    const printLinesScrambled = (newLines: JSX.Element[], index: number) => {
        let scrambledLines: JSX.Element[] = [];
        const delays = [
            30, 30, 30, 30, 30, 30, 50, 30, 30, 50, 50, 50, 30, 50, 100, 100,
        ];
        let step = 1.0 / delays.length;
        let chance = step;
        for (let round = 0; round < delays.length; round++) {
            scrambledLines.push(scrambleLine(newLines, index, chance));
            chance += step;
        }

        setGeistMode("outputting");

        for (let round = 0; round < delays.length; round++) {
            setTimeout(
                () => {
                    if (round === 0) {
                        setLines((lines) => [...lines, scrambledLines[round]]);
                    } else {
                        setLines((lines) => [...lines.slice(0, -1), scrambledLines[round]]);
                    }
                },
                delays.slice(0, round + 1).reduce((sum, delay) => sum + delay, 0)
            );
        }

        setTimeout(
            () => {
                setLines((lines) => [...lines.slice(0, -1), newLines[index]]);
                setGeistMode("waiting");
            },
            delays.reduce((sum, delay) => sum + delay, 0)
        );
    };

    const hasInitialized = useRef(false);

    const setupAnimations = () => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const initialCwd = devDir + promptDelimiter;
        let chars = initialCwd.split("");
        const animateChar = (index: number) => {
            if (index < chars.length) {
                setTerminalPrompt((prev) => prev + chars[index]);
                setTimeout(() => animateChar(index + 1), 50);
            } else {
                setTimeout(() => {
                    printLines(motd);
                }, 1);

                initialCommandTimeout.current = setTimeout(() => {
                    typeCmd("ls");
                    if (expand) {
                        initialCommandTimeout.current = setTimeout(() => {
                            typeCmd(`${expand}`);
                        }, 750);
                    }
                }, 500);
            }
        };

        setTimeout(() => {
            document.body.classList.remove("loading");
        }, 1);
        animateChar(0);
    };

    const [lines, setLines] = useState<JSX.Element[]>([]);

    const initialCommandTimeout = useRef<NodeJS.Timeout>();
    const [lastKey, setLastKey] = useState(() => {
        setupAnimations();
        return "";
    });

    const [lastKeyTime, setLastKeyTime] = useState(0);

    const keyDownHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
        // Special handling for Ctrl+C and Ctrl+D
        if (event.ctrlKey && (event.key === "c" || event.key === "d")) {
            event.preventDefault();
            setRunningBinary(undefined);
            return;
        }

        if (event.ctrlKey && event.key === "u") {
            setInputText("");
            return;
        }

        if (event.metaKey && event.key === "k") {
            return setLines([]);
        }

        // Ignore other keystrokes with modifiers (except shift)
        if (event.ctrlKey || event.altKey || event.metaKey) {
            return;
        }

        // Cancel the initial command if the user presses a key
        if (initialCommandTimeout.current) {
            clearTimeout(initialCommandTimeout.current);
            initialCommandTimeout.current = undefined;
        }

        if (event.key === "Tab") {
            event.preventDefault();
            setGeistMode("autocompleting");
        } else if (event.key.length === 1 || event.key === "Backspace") {
            setGeistMode("inputting");
        }
        setLastKey(event.key);
        setLastKeyTime(Date.now());
    };

    useEffect(() => {
        if (lastKey === "Enter") {
            handleInput(inputText);
            if (onInteraction) {
                onInteraction();
            }
        } else if (lastKey.length === 1) {
            // setInputText((inputText) => inputText + lastKey);
        } else if (lastKey === "Tab") {
            tabComplete(inputText);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastKey, lastKeyTime]);

    const [geistMode, setGeistMode] = useState<
        "waiting" | "outputting" | "inputting" | "autocompleting"
    >("waiting");

    useEffect(() => {
        if (!isMobile) {
            let timeout = setTimeout(refocusInput, 10);
            return () => clearTimeout(timeout);
        }
    }, [inputText, isMobile]);

    const promptRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        promptRef.current?.scrollIntoView();
    };

    useEffect(() => {
        scrollToBottom();
    }, [lines]);

    const inputRef = useRef<HTMLInputElement>(null);

    const refocusInput = () => {
        inputRef.current?.focus();
    };

    useEffect(() => {
        document.addEventListener("keydown", refocusInput);
        return () => document.removeEventListener("keydown", refocusInput);
    }, []);

    const lsOrKeyboard = () => {
        if (isMobile) {
            inputRef.current?.focus();
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        } else {
            typeCmd("ls");
        }
    };

    const runLSCommand = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        typeCmd("ls");
    };


    let hovering = hoverText?.length && !inputText.length;
    let fieldSize = isMobile
        ? inputText.length || 0
        : inputText.length || hoverText?.length || 0;

    return (
        <div
            className="terminal"
            style={{
                padding: "1.5em",
                fontSize: "1.35em",
                fontWeight: 280,
                fontFamily: "sans-serif",
            }}
            onClick={onInteraction}
        >
            {lines.map((line, index) => {
                // const isFaded = index < lines.length - 6;
                const opacity = 1.0; //isFaded ? 0.5 - 0.02 * (lines.length - index - 10) : 1;

                return (
                    <div
                        key={index}
                        className="typedLine"
                        style={{
                            opacity: opacity,
                        }}
                    >
                        {React.cloneElement(line)}
                    </div>
                );
            })}
            <div
                id="prompt"
                ref={promptRef}
                onClick={isMobile ? lsOrKeyboard : undefined}
            >
                <span className="cwd" onClick={runLSCommand}>
                    {user && ((user.name || user.email) + "~")}{runningBinary === undefined ? terminalPrompt : runningBinaryPrompt}
                </span>
                <input
                    className="inputText"
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    placeholder={isMobile ? undefined : hoverText}
                    onChange={(e) => setInputText(e.target.value)}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    onKeyDown={keyDownHandler}
                    onFocus={isMobile ? undefined : refocusInput}
                    size={fieldSize}
                    style={{
                        width: `${fieldSize}.25ch`,
                    }}
                />

                {/* <GeistComponent
                    mode={hovering ? "inputting" : geistMode}
                    onClick={lsOrKeyboard}
                /> */}
            </div>
        </div>
    );
};

export default Terminal;
//
