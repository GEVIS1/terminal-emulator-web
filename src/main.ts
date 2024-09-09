import './style.css'
const canvas = document.querySelector<HTMLPreElement>('#canvas');

// TODO: animate ripple from centre?
let canvasText = "";

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

// const testElement = document.createElement("div") as HTMLDivElement;
// if (!testElement) {
//   throw new Error("Unable to query testElement")
// }
// testElement.style.background = "green";
// testElement.style.position = "absolute";
// const index = Math.floor(window.innerWidth / textSizeRect.width);
// testElement.style.left = `${(textSizeRect.width * index).toString()}px`;
// testElement.style.width = `${textSizeRect.width.toString()}px`;
// testElement.style.height = `${textSizeRect.height.toString()}px`;

// document.querySelector("body")?.appendChild(testElement);

if (!canvas) {
  throw new Error("Unable to query canvas/pre element")
}
canvas.textContent = "ddderp"

window.addEventListener('resize', async (_event: Event) => {
  const columns = Math.floor(window.innerWidth / textSizeRect.width);
  const rows = Math.floor(window.innerHeight / textSizeRect.height);
  console.log("columns: ",columns)
  console.log("rows: ",rows)
  
  let buffer = "";

  let windowTitle = "Hello World!";
  

  const middleWidth = columns - 2;
  if ((windowTitle.length % 2) !== 0) {
    windowTitle += " ";
  }
  
  // TODO: fix off by one error on middleWidthHalf
  const middleWidthHalf = Math.floor((middleWidth / 2) - (windowTitle.length / 2) - 1);

  console.log("middleWidthHalf: ", middleWidthHalf)

  "{}"

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
  for (let row = 1; row < rows - 1; row++) {
    buffer += "║";
    buffer += " ".repeat(middleWidth);
    buffer += "║";
    buffer += "\n";
  }
  // Last row
  buffer += "╚";
  buffer += "═".repeat(middleWidth);
  buffer += "╝";
  buffer += "\n";
  
  canvas.innerText = buffer;
  
  console.log() 
  console.log(window.innerWidth)
});


