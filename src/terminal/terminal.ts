// Credit for string array to type union https://stackoverflow.com/a/45486495
const ALL_COMMANDS = ["clear", "help", "whoami", "hostname"] as const;
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
  private inputBuffer: Array<string> = [];

  constructor(canvas: HTMLDivElement) {
    if (!canvas) {
      throw new Error("Unable to query canvas");
    }

    this.canvas = canvas;

    // TODO: consider deleting element
    const textSize = document.createElement<"p">("p");
    document.querySelector("body")?.appendChild(textSize);
    if (!textSize) {
      throw new Error("Unable to query textSize");
    }
    textSize.style.position = "absolute";
    textSize.style.top = "-100px";
    textSize.style.padding = "0px";
    textSize.textContent = "╔";
    this.textSizeRect = textSize.getBoundingClientRect();

    this.columns = Math.floor(window.innerWidth / this.textSizeRect.width);
    this.rows = Math.floor(window.innerHeight / this.textSizeRect.height);

    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener("resize", async (_event: Event) => {
      this.columns = Math.floor(window.innerWidth / this.textSizeRect.width);
      this.rows = Math.floor(window.innerHeight / this.textSizeRect.height);
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

      //updateElements()
    });
  }

  // TODO: animate ripple from centre?

  start() {
    requestAnimationFrame(this.draw);
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
        // TODO: Handle spaces/erronous input
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

      if (urlMatch) {
        for (let url of urlMatch) {
          if (url === "") {
            continue;
          }

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

  // TODO: Only update elements when something changed
  draw = async (time: number) => {
    if (time - this.lastCursorTime > this.cursorTime) {
      this.lastCursorTime = time;
      this.drawCursor = !this.drawCursor;
    }

    this.canvas.innerHTML = "";

    let buffer = "";
    let inputBufferStr = this.inputBuffer.join("");

    for (let row = 0; row < this.rows - 1; row++) {
      let bufferIndex = -(this.rows - 1) + this.windowBuffer.length + row; // + 1;
      buffer = "";

      if (this.windowBuffer[bufferIndex] === undefined) {
        buffer += "";
        buffer += "\u00A0".repeat(this.columns);
        console.log(`Wrote ${this.columns} spaces to buffer`);
      } else {
        buffer += this.windowBuffer[bufferIndex];
        // TODO: Properly handle negative numbers. Wrap text perhaps? Push it to the buffer.. etc.
        let extraSpaces = this.columns - this.windowBuffer[bufferIndex].length;
        if (extraSpaces > 0) {
          buffer += "\u00A0".repeat(extraSpaces);
          console.log(`Wrote ${extraSpaces} spaces to buffer`);
        }
      }

      this.canvas.appendChild(this.createLineElement(buffer));
      //buffer += appendNewline(buffer)
    }

    // Input line
    // TODO: make input line a text input so it works on mobile
    buffer = this.ps1;
    let maxInputChars = this.columns - this.ps1.length;

    if (this.drawCursor) {
      inputBufferStr += "█";
    } else {
      inputBufferStr += " ";
    }

    // TODO: ~fix overflow~ write test for overflow
    if (inputBufferStr.length > maxInputChars) {
      buffer += inputBufferStr.slice(
        inputBufferStr.length - maxInputChars,
        inputBufferStr.length
      );
    } else {
      buffer += inputBufferStr;
      buffer += "\u00A0".repeat(
        this.columns - inputBufferStr.length - this.ps1.length
      );
    }

    this.canvas.appendChild(this.createLineElement(buffer, false));

    requestAnimationFrame(this.draw);
  };
}

export default Terminal;
