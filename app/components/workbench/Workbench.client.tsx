import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { IconButton } from '~/components/ui/IconButton';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import useViewport from '~/lib/hooks';
import Cookies from 'js-cookie';
import { getAccountClient } from '~/lib/appwrite';
import axios from 'axios';
import type { CommitInfo } from '~/types/commits';
import type { FileMap } from '~/types/workbench-files';
import type { Project } from '~/types/project';
import type { Message } from '~/types/message';
import { useLoaderData } from '@remix-run/react';
interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
  project?: Project;
  messages?: Message[];
}

const viewTransition = { ease: cubicEasingFn };

const sliderOptions: SliderOptions<WorkbenchViewType> = {
  left: {
    value: 'code',
    text: 'Code',
  },
  right: {
    value: 'preview',
    text: 'Preview',
  },
};

const workbenchVariants = {
  closed: {
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

export const Workbench = memo(({ chatStarted, isStreaming, project, messages }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const [isSyncing, setIsSyncing] = useState(false);

  const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const selectedFile = useStore(workbenchStore.selectedFile);
  const currentDocument = useStore(workbenchStore.currentDocument);
  const unsavedFiles = useStore(workbenchStore.unsavedFiles);
  const files = useStore(workbenchStore.files);
  const selectedView = useStore(workbenchStore.currentView);

  const isSmallViewport = useViewport(1024);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [repositoryDirents, setRepositoryDirents] = useState<FileMap>({});


  const fetchLatestCommits = async (projectRepositoryName: string) => {
    const authToken = (await getAccountClient().createJWT()).jwt;
    try {
      const response = await axios.get('/api/repositories/commits?projectRepositoryName=' + projectRepositoryName, {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
      });
      setCommits(response.data.commits);
      console.log("commits =", response.data);
    } catch (error) {
      console.error('Error fetching commits: ', error);
    }
  }

  const fetchLatestDirents = async (projectRepositoryName: string) => {
    const authToken = (await getAccountClient().createJWT()).jwt;
    try {
      const response = await axios.get('/api/repositories/dirents?projectRepositoryName=' + projectRepositoryName, {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
      });
      setRepositoryDirents(response.data);
      if (messages && messages[1]) {
        if (Object.keys(response.data).length > 0) {
          if (Object.keys(response.data).length > 0) {
            workbenchStore.createFilesFromGitRepo(response.data, messages[1].id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dirents: ', error);
    }
  }

  useEffect(() => {
    if (!project) {
      console.error('Project not found');
      return;
    }
    fetchLatestCommits(project?.repositoryName);
  }, [project])

  const pullFromGit = useCallback(() => {
    if (!project) {
      console.error('Project not found');
      return;
    }
    fetchLatestDirents(project?.repositoryName);
  }, [project])

  const hasUnsavedChangesForProject = () => {
    if (commits.length === 0) {
      return true;
    }
    if (repositoryDirents) {
      for (const key in files) {
        if (Object.prototype.hasOwnProperty.call(files, key)) {
          const editorFile = files[key];
          const repositoryFile = repositoryDirents[key];
          if (editorFile?.type === "file" && repositoryFile?.type === "file") {
            if (editorFile.content !== repositoryFile.content) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  const hasUnfetchedChangesFromProject = () => {
    return (commits.length > 0 && Object.keys(repositoryDirents).length === 0);
  }

  const setSelectedView = (view: WorkbenchViewType) => {
    workbenchStore.currentView.set(view);
  };

  useEffect(() => {
    if (hasPreview) {
      setSelectedView('preview');
    }
  }, [hasPreview]);

  useEffect(() => {
    workbenchStore.setDocuments(files);
  }, [files]);

  const onEditorChange = useCallback<OnEditorChange>((update) => {
    workbenchStore.setCurrentDocumentContent(update.content);
  }, []);

  const onEditorScroll = useCallback<OnEditorScroll>((position) => {
    workbenchStore.setCurrentDocumentScrollPosition(position);
  }, []);

  const onFileSelect = useCallback((filePath: string | undefined) => {
    workbenchStore.setSelectedFile(filePath);
  }, []);

  const onFileSave = useCallback(() => {
    workbenchStore.saveCurrentDocument().catch(() => {
      toast.error('Failed to update file content');
    });
  }, []);

  const onFileReset = useCallback(() => {
    workbenchStore.resetCurrentDocument();
  }, []);

  const handleSyncFiles = useCallback(async () => {
    setIsSyncing(true);

    try {
      const directoryHandle = await window.showDirectoryPicker();
      await workbenchStore.syncFiles(directoryHandle);
      toast.success('Files synced successfully');
    } catch (error) {
      console.error('Error syncing files:', error);
      toast.error('Failed to sync files');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const { isCodeMode } = useLoaderData<{ isCodeMode?: boolean }>();
  
  return (
    chatStarted && (
      <motion.div
        initial="closed"
        animate={showWorkbench ? 'open' : 'closed'}
        variants={workbenchVariants}
        className="z-workbench"
      >
        <div
          className={classNames(
            'fixed top-[calc(var(--header-height)+1.5rem)] bottom-6 w-[var(--workbench-inner-width)] mr-4 z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
            {
              'w-full': isSmallViewport,
              'left-0': showWorkbench && isSmallViewport,
              'left-[var(--workbench-left)]': showWorkbench,
              'left-[100%]': !showWorkbench,
            },
          )}
        >
          <div className="absolute inset-0 px-2 lg:px-6">
            <div className="h-full flex flex-col bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor shadow-sm rounded-lg overflow-hidden">
              <div className={"flex items-center px-3 py-2 border-b border-bolt-elements-borderColor"  + (isCodeMode ? "hidden" : "flex")}>
                <Slider selected={selectedView} options={sliderOptions} setSelected={setSelectedView} />
                <div className="ml-auto" />
                {selectedView === 'code' && (
                  <div className="flex overflow-y-auto">
                    <PanelHeaderButton
                      className="mr-1 text-sm"
                      onClick={() => {
                        console.log("Add Tags");
                      }}
                    >
                      <div className="i-ph:tag" />
                      Add Tags
                    </PanelHeaderButton>
                    <PanelHeaderButton
                      className="mr-1 text-sm"
                      onClick={() => {
                        workbenchStore.downloadZip();
                      }}
                    >
                      <div className="i-ph:code" />
                      Download Code
                    </PanelHeaderButton>
                    <PanelHeaderButton className="mr-1 text-sm" onClick={handleSyncFiles} disabled={isSyncing}>
                      {isSyncing ? <div className="i-ph:spinner" /> : <div className="i-ph:cloud-arrow-down" />}
                      {isSyncing ? 'Syncing...' : 'Sync Files'}
                    </PanelHeaderButton>
                    <PanelHeaderButton
                      className="mr-1 text-sm"
                      onClick={() => {
                        workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get());
                      }}
                    >
                      <div className="i-ph:terminal" />
                      Toggle Terminal
                    </PanelHeaderButton>

                    <PanelHeaderButton
                      className="mr-1 text-sm"
                      onClick={async () => {
                        if (!project) {
                          throw new Error('Project not found');
                        };
                        await workbenchStore.pushToGit(project.repositoryName)
                        fetchLatestDirents(project.repositoryName);
                      }}
                      disabled={hasUnfetchedChangesFromProject()}
                    >
                      <div className="i-ph:box-arrow-up" />
                      Save to project
                      {hasUnsavedChangesForProject() ? <span className="i-ph:circle-fill scale-68 shrink-0 text-orange-500"></span> : <></>}
                    </PanelHeaderButton>
                    <PanelHeaderButton
                      className="mr-1 text-sm"
                      onClick={async () => {
                        if (!project) {
                          throw new Error('Project not found');
                        };
                        pullFromGit()
                      }}
                      disabled={commits.length === 0}
                    >
                      <div className="i-ph:box-arrow-down" />
                      Fetch from project
                      {hasUnfetchedChangesFromProject() ? <span className="i-ph:circle-fill scale-68 shrink-0 text-orange-500"></span> : <></>}
                    </PanelHeaderButton>
                    <PanelHeaderButton
                      className="mr-1 text-sm"
                      onClick={() => {
                        const repoName = prompt(
                          'Please enter a name for your new GitHub repository:',
                          'bolt-generated-project',
                        );

                        if (!repoName) {
                          alert('Repository name is required. Push to GitHub cancelled.');
                          return;
                        }

                        const githubUsername = Cookies.get('githubUsername');
                        const githubToken = Cookies.get('githubToken');

                        if (!githubUsername || !githubToken) {
                          const usernameInput = prompt('Please enter your GitHub username:');
                          const tokenInput = prompt('Please enter your GitHub personal access token:');

                          if (!usernameInput || !tokenInput) {
                            alert('GitHub username and token are required. Push to GitHub cancelled.');
                            return;
                          }

                          workbenchStore.pushToGitHub(repoName, usernameInput, tokenInput);
                        } else {
                          workbenchStore.pushToGitHub(repoName, githubUsername, githubToken);
                        }
                      }}
                    >
                      <div className="i-ph:floppy-disk" />
                      Save to project
                      <span className="i-ph:circle-fill scale-68 shrink-0 text-orange-500"></span>
                    </PanelHeaderButton>
                  </div>
                )}
                <IconButton
                  icon="i-ph:x-circle"
                  className="-mr-1"
                  size="xl"
                  onClick={() => {
                    workbenchStore.showWorkbench.set(false);
                  }}
                />
              </div>
              <div className="relative flex-1 overflow-hidden">
                <View
                  initial={{ x: selectedView === 'code' ? 0 : '-100%' }}
                  animate={{ x: selectedView === 'code' ? 0 : '-100%' }}
                  className={isCodeMode ? "hidden" : ""}
                >
                  <EditorPanel
                    editorDocument={currentDocument}
                    isStreaming={isStreaming}
                    selectedFile={selectedFile}
                    files={files}
                    unsavedFiles={unsavedFiles}
                    onFileSelect={onFileSelect}
                    onEditorScroll={onEditorScroll}
                    onEditorChange={onEditorChange}
                    onFileSave={onFileSave}
                    onFileReset={onFileReset}
                  />
                </View>
                <View
                  initial={{ x: selectedView === 'preview' ? 0 : '100%' }}
                  animate={{ x: selectedView === 'preview' ? 0 : '100%' }}
                >
                  <Preview />
                </View>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  );
});
interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});
