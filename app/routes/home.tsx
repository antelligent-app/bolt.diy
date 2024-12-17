import { useEffect, useState } from "react";
import jsonpath from "jsonpath";
import { motion } from 'framer-motion';
import { IconButton } from "~/components/ui/IconButton";

type Command = {
  descriptionBody: string,
  subcommands: CommandList
}

type CommandList = {
  [commandName: string]: Command
}

const commands: CommandList = {
  about: {
    descriptionBody: `
<p class="mb-4">
Modern AI will fundamentally change how people use software in their daily lives. Agentic applications could, for the first time, enable computers to work with people in much the same way people work with people.
</p>
<p class="mb-4">
But it won’t happen without removing a ton of blockers. We need new UI patterns, a reimagined privacy model, and a developer platform that makes it radically simpler to build useful agents. That’s the challenge we’re taking on.
</p>
<p>Want to know more? <a class="text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary" target="_blank" rel="noopener noreferrer" href="mailto:respondgaurav@gmail.com">Reach out</a></p>
    `,
    subcommands: {}
  },
  jobs: {
    descriptionBody: '',
    subcommands: {}
  },
  who: {
    descriptionBody: '',
    subcommands: {
      ggandhi: {
        descriptionBody: `
<p class="mb-4">
Experienced Chief Executive Officer with a demonstrated history of working in the research industry. Skilled in Analytical Skills, Innovation Management, Management, Start-ups, Community building and Leadership. Strong business development professional with a PhD focused in Neural Networks, Chaos Theory and Nonlinear Systems. 
</p>
<p class="mb-4">
I blog at <a class="text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary" target="_blank" rel="noopener noreferrer" href="https://conversant.substack.com">https://conversant.substack.com</a>
</p>
        `,
        subcommands: {}
      },
      johnsnow: {
        descriptionBody: `
<p class="mb-4">
Visionary Chief Technology Officer with a distinguished career spearheading digital transformations, leveraging AI, blockchain, and cloud technologies to drive operational excellence and market expansion. Proven success in enhancing company infrastructure, resulting in a 40% increase in efficiency, a 25% capture of new fintech market share, and a 50% reduction in security breaches. Adept at fostering innovation and technical prowess, evidenced by a 90% retention of top talent and pioneering a DevOps culture that halved the software development lifecycle, positioning the company at the forefront of industry advancements.
</p> 
<p class="mb-4">
Send me a mail at <a class="text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary" target="_blank" rel="noopener noreferrer" href="mailto:johnsnow@gmail.com">johnsnow@gmail.com</a>
</p>
`,
        subcommands: {}
      }
    }
  }
}

type CommandOutputProps = {
  text: string,
  outputType: 'command' | 'html',
  commandAction?: string,
  setCommandInput: (input: string) => void,
  setCommandSuggestion: (input: string) => void
}

function CommandOutput({ text, outputType, commandAction, setCommandInput, setCommandSuggestion }: CommandOutputProps) {
  const [showArrow, setShowArrow] = useState(false);
  return (
    <div className="mb-4">
      {
        outputType === 'html' ? (
          <div dangerouslySetInnerHTML={{ __html: text }}></div>
        ) : (
          <div className="command-link text-bolt-elements-button-primary-text hover:cursor-pointer">
            <a style={{ position: 'relative' }} onClick={() => {
              if (commandAction) {
                setCommandInput(commandAction);
              }
            }} onMouseEnter={() => {
              setShowArrow(true);
              setCommandSuggestion(text);
            }} onMouseLeave={() => {
              setShowArrow(false);
              setCommandSuggestion('');
            }}>
              {
                showArrow && (<span style={{
                  position: "absolute",
                  left: -20
                }}>{">"}</span>)
              }
              {text}
            </a>
          </div>
        )
      }
    </div>
  )
}

export default function Home() {
  const [commandInput, setCommandInput] = useState('')
  const [commandSuggestion, setCommandSuggestion] = useState('')
  const [outputs, setOutputs] = useState<Array<any>>([]);

  const executeCommand = () => {
    if (commandInput === 'ls') {
      setOutputs([
        ...outputs,
        ...Object.keys(commands).map((key) => ({
          outputType: 'command',
          text: key,
          commandAction: key
        }))
      ]);
      setCommandInput('');
    } else {
      const commandPath = `$.${commandInput.trim().replaceAll(' ', '.subcommands.')}`;
      console.log(commandPath);
      const commandToBeExecuted: Command[] = jsonpath.query(commands, commandPath);
      if (commandToBeExecuted[0]) {
        setOutputs([
          ...outputs,
          {
            outputType: 'html',
            text: commandToBeExecuted[0].descriptionBody
          },
          ...Object.keys(commandToBeExecuted[0].subcommands).map((key) => ({
            outputType: 'command',
            text: key,
            commandAction: `${commandInput} ${key}`
          }))
        ]);
        setCommandInput('');
      }
    }
  }

  const typeCommandSlowly = (command: string) => {
    let indexTyped = -1;
    const typeUntilNextLetter = () => {
      indexTyped++;
      setCommandInput(command.substring(0, indexTyped))
      if (indexTyped < command.length) {
        setTimeout(() => {
          typeUntilNextLetter();
        }, 100)
      } else {
        setTimeout(() => {
          executeCommand();
        }, 1000);
      }
    }
    typeUntilNextLetter();
  }

  useEffect(() => {
    typeCommandSlowly('ls');
  }, [])


  return (
    <div className="flex justify-end p-10 flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <div className="output max-w-3xl text-bolt-elements-textPrimary text-2xl">
        <div className="mb-4">
          We're building a next-gen operating system for AI agents.
        </div>
        {
          outputs.map((output, index) => (
            <CommandOutput
              key={`${output.text}-${index}`}
              text={output.text}
              outputType={output.outputType}
              setCommandInput={typeCommandSlowly}
              setCommandSuggestion={(command) => {
                setCommandSuggestion(command);
              }}
              commandAction={output.commandAction}
            />
          ))
        }
      </div>
      <form className="flex flex-row items-center text-bolt-elements-textSecondary text-2xl" onSubmit={($event) => {
        $event.preventDefault();
        executeCommand();
      }}>
        <label className="flex-none">
          /dev/agents {"> "}
        </label>
        <input
          className="bg-bolt-elements-background-depth-1 border-0 ml-2"
          style={{
            border: 'none',
            outline: 'none',
            width: `${Math.max(1, commandInput.length + 1)}ch`
          }}
          type="text"
          value={commandInput}
          onChange={($event) => {
            setCommandInput($event.target.value);
          }}
          placeholder={commandSuggestion}
          autoFocus={true}
        />
        <motion.div
          initial={{zoom: 0.8}}
          animate={{
            zoom: 1
          }}
          transition={{repeat: Infinity, duration: 1}}
        >
          <IconButton onClick={() => {
            executeCommand()
          }}>
            <i className="i-ph:chat-teardrop"></i>
          </IconButton>
        </motion.div>
      </form>
    </div>
  )
}