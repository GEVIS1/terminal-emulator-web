import './style.css'
const canvas = document.querySelector<HTMLPreElement>('#canvas');

// TODO: animate ripple from centre?

const textSize = document.createElement<"pre">("pre");
let textSizeRect;

// TODO: consider deleting element
document.querySelector("body")?.appendChild(textSize);
if (!textSize) {
  throw new Error("Unable to query textSize")
}
textSize.style.position = "absolute";
textSize.style.top = "-100px";
textSize.style.padding = "0px";
textSize.textContent = "╔";
textSizeRect = textSize.getBoundingClientRect();

let columns = Math.floor(window.innerWidth / textSizeRect.width);
let rows = Math.floor(window.innerHeight / textSizeRect.height);
let middleWidth = columns - 2;

// Do this as a hack to make links clickable initially.
// const testNode = document.createElement("a")
// testNode.href = "https://www.google.com"
// testNode.style.backgroundColor = "rgba(0,0,255,125)"
// testNode.style.position = "absolute"
// testNode.style.width = "200px"
// testNode.style.height = `${textSizeRect.height}px`
// testNode.style.top = `${(rows-2)*textSizeRect.height}px`
// testNode.style.left = `${textSizeRect.width}px`
// document.querySelector("body")?.appendChild(testNode)

let user = "user"
let host = document.location.hostname
let pwd = `~/`
const generatePs1 = () => `${user}@${host} ${pwd} $ `
let ps1 = generatePs1();

let cursorTime = 1000;
let lastCursorTime = 0;
let drawCursor = true;

if (!canvas) {
  throw new Error("Unable to query canvas/pre element")
}

// Credit https://stackoverflow.com/a/45486495
const ALL_COMMANDS = ["clear", "help", "whoami", "hostname"] as const;
type CommandTuple = typeof ALL_COMMANDS;
type Command = CommandTuple[number];

function isCommand(command: string | undefined): command is Command {
  for (const validCommand of ALL_COMMANDS) {
    if (command === validCommand)  {
      return true;
    }
  }
  return false;
}

// TODO: abstract this into windowbuffer class perhaps
function windowBufferSafePush(windowBuffer: Array<string>, str: string) {
  if (str.length > middleWidth) {
    for (let i = 0; i < str.length; i += middleWidth) {
      const start = i;
      let end = i+middleWidth;
      if (end > str.length - 1) {
        end = str.length - 1;
      }
      windowBuffer.push(str.slice(start, end))
    }
  } else {
    windowBuffer.push(str)
  }
}

async function execute(commandStr: string) {
  let commandArray = commandStr.split(" ");
  let command = commandArray.shift()

  if (!isCommand(command)) {
    if (command === "") {
      return;
    }
    windowBufferSafePush(windowBuffer, `Error: No such command \`${command}\'`)
    
    return;
  }

  switch (command) {
    case "clear":
      // TODO: consider scrolling/inserting empty rows instead?
      windowBuffer = [];
    break;
    case "help":
      windowBuffer.push(`Available commands: ${ALL_COMMANDS.join(" ")}`)
    break;
    case "hostname":
      // TODO: Handle spaces/erronous input
      let newHostname = commandArray.shift();
      
      if (newHostname === undefined) {
        windowBuffer.push(host);
        return;
      }

      host = newHostname;
      ps1 = generatePs1();
    break;
    case "whoami":
      windowBuffer.push(user);
    break;
      
  }
}

let windowBuffer: Array<string> = [];
// for (let i = 0; i < 20; ++i) {
//   windowBuffer.push(`Line ${i}`);
// }

//Array(rows-2).fill("");
let inputBuffer: Array<string> = [];

window.addEventListener("resize", async (_event: Event) => {
  columns = Math.floor(window.innerWidth / textSizeRect.width);
  rows = Math.floor(window.innerHeight / textSizeRect.height);
  middleWidth = columns - 2;
});

window.addEventListener('keydown', async (event: KeyboardEvent) => {
  if (event.key == "Backspace" && inputBuffer.length > 0) {
    inputBuffer.pop();
  } else if (event.key == "Enter") {
    let inputstr = inputBuffer.join("");

    // TODO: ~handle resizing~ write test for resizing
    let bufferStr = ps1 + inputstr;
    windowBufferSafePush(windowBuffer, bufferStr);
    execute(inputstr);
    inputBuffer = [];
  }
  else if (event.ctrlKey && event.key == "v") {
    let pastedText = await navigator.clipboard.readText();
    inputBuffer.push(pastedText)
  }
  else if (event.key.length == 1) // TODO: Robust testing required. Are emojis 1 length?? 
  {
    if (event.key == "'") {
      event.preventDefault();
    }
    inputBuffer.push(event.key)
  }
});

const draw = async (time: number) => {
  if (time - lastCursorTime > cursorTime) {
    lastCursorTime = time;
    drawCursor = !drawCursor;
  }

  let buffer = "";

  let windowTitle = "Hello World!";
  if ((windowTitle.length % 2) !== 0) {
    windowTitle += " ";
  }
  
  // TODO: fix off by one error on middleWidthHalf
  const middleWidthHalf = Math.floor((middleWidth / 2) - (windowTitle.length / 2) - 1);

  let inputBufferStr = inputBuffer.join("");

  // First row
  buffer += "╔";
  buffer += "═".repeat(middleWidthHalf);
  buffer += "╡";
  buffer += windowTitle;
  buffer += "╞";
  buffer += "═".repeat(middleWidthHalf);
  buffer += "╗";
  buffer += "\n";

  // Middle
  for (let row = 0; row < rows - 3; row++) {
    let bufferIndex = (-(rows - 2)) + windowBuffer.length + row + 1;
    buffer += "║";
    if (windowBuffer[bufferIndex] === undefined) {
      buffer += "";
      buffer += " ".repeat(middleWidth);  
    } else {
      buffer += windowBuffer[bufferIndex];
      // TODO: Properly handle negative numbers. Wrap text perhaps? Push it to the buffer.. etc.
      let extraSpaces = middleWidth - (windowBuffer[bufferIndex].length);
      if (extraSpaces > 0) {
        buffer += " ".repeat(extraSpaces);
      }
    }
    buffer += "║";
    buffer += "\n";
  }

  // Input line
  buffer += "║";
  buffer += ps1
  let maxInputChars = middleWidth - ps1.length;
  
  if (drawCursor) {
    inputBufferStr += "█";
  } else {
    inputBufferStr += " ";
  } 

  // TODO: ~fix overflow~ write test for overflow
  if (inputBufferStr.length > maxInputChars) {
    buffer += inputBufferStr.slice(inputBufferStr.length - maxInputChars, inputBufferStr.length)
  } else {
    buffer += inputBufferStr;
    buffer += " ".repeat(middleWidth - inputBufferStr.length - ps1.length);
  }
  buffer += "║";
  buffer += "\n";

  // Last row
  buffer += "╚";
  buffer += "═".repeat(middleWidth);
  buffer += "╝";
  buffer += "\n";
  
  canvas.innerText = buffer;

  requestAnimationFrame(draw)
}

requestAnimationFrame(draw)
