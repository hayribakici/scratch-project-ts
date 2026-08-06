# scratch-project-ts

A small TypeScript wrapper for reading Scratch projects and retrieving their scripts as [scratchblocks](https://github.com/scratchblocks/scratchblocks) code.

## Installation

```sh
npm install scratch-project-ts
```

## Usage

```ts
import { Opcode, readSB3 } from "scratch-project-ts";

const data = await file.arrayBuffer();
const project = await readSB3(data);

// retrieve scripts from the sprite `Crab`
const crab = project.getTarget("Crab");

// retrieve all `when green flag clicked` scripts
const greenFlagScripts = crab?.getScripts().filter(
  script => script.opcode === Opcode.GreenFlag
);

// convert to scratchblocks sources calling `parse-sb3-blocks`
const sources = greenFlagScripts?.map(
  script => script.toScratchblocks()
);
```

A target can have more than one script starting with the same opcode. Use `contains()` to check for a block (e.g. `if`, `repeat until` etc.) anywhere inside a script:

```ts
const scriptsWithLoops = crab?.getScripts().filter(
  script => script.contains("control_repeat_until")
);
```

`Opcode` contains a few commonly used blocks such as `event_whenflagclicked`. Other opcode strings, including extension opcodes, can be used directly. Converting a script to scratchblocks code depends on support in [`parse-sb3-blocks` library](https://github.com/apple502j/parse-sb3-blocks).

## Development

```sh
npm install
npm test
npm run build
```

## License

[MIT](LICENSE)
