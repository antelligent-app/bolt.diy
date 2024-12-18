import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useState, useEffect, useRef } from "react";
import "../styles/components/IndexPage.scss";
import Terminal from "~/components/home/Terminal";
import type { Project } from '~/types/project';
import { ClientOnly } from 'remix-utils/client-only';
import { Chat } from '~/components/chat/Chat.client';
import { BaseChat } from '~/components/chat/BaseChat';
import { useLoaderData } from '@remix-run/react';
import NewTerminal from '~/components/home/NewTerminal';



export const meta: MetaFunction = () => {
    return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export async function loader(args: LoaderFunctionArgs) {
    const request = args.request;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const create = url.searchParams.get('create');

    return json({
        id: id,
        create: create,
    });
}


export default function IndexPage({ expand }: { expand?: string }) {
    const [beforeInteraction, setBeforeInteraction] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [showProjects, setShowProjects] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isCreateProject, setIsCreateProject] = useState(false);
    const sendMszref = useRef<{
        sendMessage: (event: React.UIEvent | null, messageInput?: string) => void;
    }>({
        sendMessage: () => { },
    });

    // Set isClient to true when the component is mounted on the client-side
    useEffect(() => {
        setIsClient(true);
    }, []);

    const { create } = useLoaderData<{
        create?: string,
    }>();

    return (
        <>

            {isClient && (
                <>
                    <div
                        className={`absolute top-10 right-10 w-[30%] h-[80%] z-10 ${showProjects ? 'fade-in' : 'fade-out'}`}
                    >
                        <div className="grid grid-cols-2 justify-items-center gap-4 overflow-y-auto h-full p-4">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="w-full h-48 bg-white rounded-lg shadow-md p-4"
                                >
                                    <div className="project-title">{project.name}</div>
                                    <div className="project-description">{project.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        className={`absolute top-10 right-10 w-[40%] h-[80%] p-4 z-10 ${(isCreateProject || selectedProject) ? 'fade-in' : 'fade-out'}`}
                    >
                        {(selectedProject || isCreateProject) && (
                            <ClientOnly
                                fallback={<BaseChat />}
                            >

                                {() => <>
                                    <Chat
                                        cmdPrompt={create}
                                        sendMszref={sendMszref}
                                    />
                                </>
                                }
                            </ClientOnly>
                        )}
                    </div>


                    {/* <Terminal
                        prompt="/dev/agents"
                        onInteraction={() => setBeforeInteraction(false)}
                        expand={expand}
                        projects={projects}
                        setProjects={setProjects}
                        showProjects={showProjects}
                        setShowProjects={setShowProjects}
                        setSelectedProject={setSelectedProject}

                        sendMszref={sendMszref}
                        setIsCreateProject={setIsCreateProject}
                    /> */}

                    <NewTerminal
                        onInteraction={() => setBeforeInteraction(false)}
                        expand={expand}
                        projects={projects}
                        setProjects={setProjects}
                        showProjects={showProjects}
                        setShowProjects={setShowProjects}
                        setSelectedProject={setSelectedProject}
                        sendMszref={sendMszref}
                        setIsCreateProject={setIsCreateProject}
                    />


                </>
            )}
            <div className="circle-container">
                <div className="circle" id="circle1"></div>
                <div className="circle" id="circle2"></div>
                <div className="circle" id="circle3"></div>
            </div>
        </>
    );
}

