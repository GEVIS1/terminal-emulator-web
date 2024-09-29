import Terminal from "./terminal/terminal"

const canvas = document.querySelector<HTMLDivElement>('#terminal');

if (!canvas) {
  throw new Error("Unable to query canvas")
}

const term = new Terminal(canvas);
term.start();
