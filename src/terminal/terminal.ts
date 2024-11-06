// Credit for string array to type union https://stackoverflow.com/a/45486495
const ALL_COMMANDS = ["clear", "help", "whoami", "hostname", "motd"] as const;
type CommandTuple = typeof ALL_COMMANDS;
type Command = CommandTuple[number];

function isCommand(command: string | undefined): command is Command {
  for (const validCommand of ALL_COMMANDS) {
    if (command === validCommand) {
      return true;
    }
  }
  return false;
}

const release = import.meta.env.PROD ? 'RELEASE' : 'DEVELOPMENT'
const version = "0.0.1" // TODO: Make this update dynamically with the app version
const formatDateString = (date: Date) => {
  const strArr = date.toUTCString().replace('GMT', 'UTC').replace(',', '').split(' ');
  [strArr[2], strArr[1], strArr[3], strArr[4], strArr[5]] = [strArr[1], strArr[2], strArr[4], strArr[5], strArr[3]]
  return strArr.join(' ');
}
const generateMotd = (version: string, release: string, dateString: string) =>
`
WebTerminal ${version}-${release} (GENERIC) #0: ${dateString}

Welcome to Steffen Geving's website!

My Email: [gevis1@student.op.ac.nz](mailto:gevis1@student.op.ac.nz)
LinkedIn: https://www.linkedin.com/in/steffengeving/
GitHub: https://www.github.com/gevis1
CV: https://cv.geving.dev

This terminal emulator is functional and a list of commands
can be found by inputting \`help'.

Enter \`motd' to see this this login announcement again.
`

class Terminal {
  private canvas: HTMLDivElement;
  private textSizeRect: DOMRect;
  private columns: number;
  private rows: number;
  private user = "user";
  private host = document.location.hostname;
  private pwd = `~/`;
  private generatePs1 = () => `${this.user}@${this.host} ${this.pwd} $ `;
  private ps1 = this.generatePs1();
  private cursorTime = 1000;
  private lastCursorTime = 0;
  private drawCursor = true;
  private windowBuffer: Array<string> = [];
  private windowBufferInvalid = true;
  private inputBuffer: Array<string> = [];

  constructor(canvas: HTMLDivElement) {
    if (!canvas) {
      throw new Error("Unable to query canvas");
    }

    this.canvas = canvas;
    
    this.textSizeRect = new DOMRect();
    this.calculateTextSize();

    this.columns = Math.floor(window.innerWidth / this.textSizeRect.width);
    this.rows = Math.floor(window.innerHeight / this.textSizeRect.height);

    this.setupEventListeners();
  }

  private calculateTextSize(): void {
    const textSize = document.createElement<"p">("p");
    const bodyElement = document.querySelector("body");
    
    if (!bodyElement) {
      console.error("Unable to query body element");
      return;
    }

    bodyElement.appendChild(textSize);

    if (!textSize) {
      console.error("Unable to query textSize");
      return;
    }
    textSize.style.position = "absolute";
    textSize.style.top = "-100px";
    textSize.style.padding = "0px";
    textSize.textContent = "╔";
    this.textSizeRect = textSize.getBoundingClientRect();
    bodyElement.removeChild(textSize);
  }

  recalculateLines() {
    this.canvas.innerHTML = "";
    let l: HTMLParagraphElement;
    for (let row = this.rows - 2; row >= 0; --row) {
      l = this.createLineElement(`${row}`, false);
      l.id = `line-${row}`
      this.canvas.appendChild(l);
    }

    this.writeBufferToLineElements();

    l = this.createLineElement(`${this.ps1} ${this.inputBuffer.join("")}`, false);
    l.id = "input-line"
    this.canvas.appendChild(l);
  }

  private writeBufferToLineElements() {
    for (let row = 0; row < this.rows - 1; ++row) {
      const line = document.getElementById(`line-${row}`);

      const bufferIndex = this.windowBuffer.length - row;

      if (line) {
        let buffer = this.windowBuffer[bufferIndex] ? this.windowBuffer[bufferIndex] : "\u00A0".repeat(this.columns);
        buffer = this.generateAnchorTags(buffer);
        line.innerHTML = buffer;
      }
    }
  }

  private generateAnchorTags(buffer: string): string {
      // Regex credit: https://regexr.com/39nr7
      const urlMatch = buffer.match(
        /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
      );
      const mdMatch = buffer.match(
        /(\[.*\])(\(.*\))/
      );

      if (mdMatch) {
        const md = mdMatch[0];
        if (md !== "") {
          const text = mdMatch[1].slice(1, mdMatch[1].length - 1);
          const href = mdMatch[2].slice(1, mdMatch[2].length - 1);
          const element = document.createElement<"a">("a");
          element.href += href;
          element.innerText = text;
          element.target = "_blank";
          
          buffer = buffer.replace(md, element.outerHTML);
        }
      } else if (urlMatch) {
        const url = urlMatch[0];
        if (url !== "") {
          const element = document.createElement<"a">("a");
          element.href += url;
          element.innerText = url;
          element.target = "_blank";
          
          buffer = buffer.replace(url, element.outerHTML);
        }
      }
      return buffer;
  }

  setupEventListeners() {
    window.addEventListener("resize", async (_event: Event) => {
      this.calculateTextSize();
      this.columns = Math.floor(window.innerWidth / this.textSizeRect.width);
      this.rows = Math.floor(window.innerHeight / this.textSizeRect.height);
      this.recalculateLines();
    });

    window.addEventListener("keydown", async (event: KeyboardEvent) => {
      if (event.key == "Backspace" && this.inputBuffer.length > 0) {
        this.inputBuffer.pop();
      } else if (event.key == "Enter") {
        let inputstr = this.inputBuffer.join("");

        // TODO: ~handle resizing~ write test for resizing
        let bufferStr = this.ps1 + inputstr;
        this.windowBufferSafePush(this.windowBuffer, bufferStr);
        this.execute(inputstr);
        this.inputBuffer = [];
        this.writeBufferToLineElements();
      } else if (event.ctrlKey && event.key == "v") {
        let pastedText = await navigator.clipboard.readText();
        this.inputBuffer.push(pastedText);
      } else if (event.key.length == 1) {
        // TODO: Robust testing required. Are emojis 1 length??
        if (event.key == "'") {
          event.preventDefault();
        }
        this.inputBuffer.push(event.key);
      }
      const inputElement = document.getElementById("input-line");
      if (inputElement) {
        inputElement.innerText = `${this.ps1} ${this.inputBuffer.join("")}`
      }
    });
    this.recalculateLines();
  }

  // TODO: animate ripple from centre?

  start() {
    this.recalculateLines();
    this.printMotd();
    this.writeBufferToLineElements();
    //requestAnimationFrame(this.draw);
  }
  // TODO: abstract this into this.windowbuffer class perhaps
  windowBufferSafePush(windowBuffer: Array<string>, str: string) {
    if (str.length > this.columns) {
      for (let i = 0; i < str.length; i += this.columns) {
        const start = i;
        let end = i + this.columns;
        if (end > str.length - 1) {
          end = str.length - 1;
        }
        windowBuffer.push(str.slice(start, end));
      }
    } else {
      windowBuffer.push(str);
    }
    
  }

  async execute(commandStr: string) {
    let commandArray = commandStr.split(" ");
    let command = commandArray.shift();

    if (!isCommand(command)) {
      if (command === "") {
        return;
      }
      this.windowBufferSafePush(
        this.windowBuffer,
        `Error: No such command \`${command}\'`
      );

      return;
    }

    switch (command) {
      case "clear":
        // TODO: consider scrolling/inserting empty rows instead?
        this.windowBuffer = [];
        break;
      case "help":
        this.windowBuffer.push(`Available commands: ${ALL_COMMANDS.join(" ")}`);
        break;
      case "hostname":
        let newHostname = commandArray.shift();

        if (newHostname === undefined) {
          this.windowBuffer.push(this.host);
          return;
        }

        this.host = newHostname;
        this.ps1 = this.generatePs1();
        break;
      case "whoami":
        this.windowBuffer.push(this.user);
        break;
      case "motd":
        this.printMotd()
        break;
    }
  }
  private printMotd() {
    const motd = generateMotd(version, release, formatDateString(new Date())).split("\n")
    for (const line of motd) {
      this.windowBuffer.push(line);
    }
  }

  createLineElement(
    buffer: string,
    generateAnchors: boolean = true
  ): HTMLParagraphElement {
    if (generateAnchors) {
      // Regex credit: https://regexr.com/39nr7
      const urlMatch = buffer.match(
        /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
      );
      const mdMatch = buffer.match(
        /(\[.*\])(\(.*\))/
      );

      if (mdMatch) {
        const md = mdMatch[0];
        if (md !== "") {
          const text = mdMatch[1].slice(1, mdMatch[1].length - 1);
          const href = mdMatch[2].slice(1, mdMatch[2].length - 1);
          const element = document.createElement<"a">("a");
          element.href += "//" + href;
          element.innerText = text;
          element.target = "_blank";
          
          buffer = buffer.replace(md, element.outerHTML);
        }
      } else if (urlMatch) {
        const url = urlMatch[0];
        if (url !== "") {
          const element = document.createElement<"a">("a");
          element.href += "//" + url;
          element.innerText = url;
          element.target = "_blank";
          
          buffer = buffer.replace(url, element.outerHTML);
        }
      }

    }

    const line = document.createElement<"p">("p");
    line.innerHTML = buffer;
    return line;
  }
}

export default Terminal;
