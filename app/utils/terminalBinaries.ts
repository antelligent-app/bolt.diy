export type Binary = (
    line: string,
    state: any,
    onAsyncComplete?: (result: string[]) => void
) => {
    output: string[];
    exitStatus: number;
    newState: any;
    prompt?: string;
};

export const echo: Binary = (line: string, state: any) => {
    return { output: [line], exitStatus: 0, newState: state };
};

const lines = ["                       ", "                       ", ""];

const WOPR_KEY = "dc55c2dbd26f87d653e2dcc1b496dc65";

// make request equivalent to above
const makeGameRequest = async (message: string) => {
    let response = await fetch(
        `https://wopr.us.davidsingleton.org/game/message`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": WOPR_KEY,
            },
            body: JSON.stringify({
                message: message,
                session_id: localStorage.getItem("wopr-session"),
            }),
        }
    );
    console.log(response);

    return response;
};

export const wopr: Binary = (
    line: string,
    state: any,
    onAsyncComplete?: (result: string[]) => void
) => {
    if (state.phase === "init") {
        localStorage.removeItem("wopr-session");
        return {
            output: lines,
            exitStatus: 0,
            newState: { phase: "login" },
            prompt: "LOGON:",
        };
    }

    if (state.phase === "login") {
        if (line.toLowerCase() === "joshua") {
            return {
                output: [
                    "LOGON SUCCESSFUL",
                    "",
                    "GREETINGS, PROFESSOR FALKEN.",
                    "CAN YOU EXPLAIN THE REMOVAL OF YOUR USER ACCOUNT",
                    "ON JUNE 23, 1973?",
                ],
                exitStatus: 0,
                newState: { phase: "ready" },
                prompt: "$ ",
            };
        } else {
            return {
                output: [
                    "INDENTIFICATION NOT RECOGNIZED BY SYSTEM",
                    "--CONNECTION TERMINATED--",
                ],
                exitStatus: 1,
                newState: {},
            };
        }
    } else if (state.phase === "ready") {
        makeGameRequest(line).then((response) => {
            if (response.status === 200) {
                if (onAsyncComplete) {
                    response.json().then((json: any) => {
                        localStorage.setItem("wopr-session", json.session_id);

                        onAsyncComplete(json.message.split("\n"));
                    });
                }
            } else {
                if (onAsyncComplete) {
                    response.json().then((json: any) => {
                        onAsyncComplete([json.detail]);
                    });
                }
            }
        });

        return {
            output: ["$ " + line],
            exitStatus: 0,
            newState: state,
        };
    }

    return {
        output: ["WOPR", "unknown command"],
        exitStatus: 1,
        newState: state,
    };
};
