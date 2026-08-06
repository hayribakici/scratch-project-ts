import JSZip from "jszip";
import { toScratchblocks } from "parse-sb3-blocks";

export type LanguageCode = string;

/** A Scratch project and its stage and sprite targets. */
export class ScratchProject {

    private readonly targets: readonly ScratchTarget[];

    constructor(json: any, readonly lang: LanguageCode = "en") {
        this.targets = json.targets.map(
            (target: any) => new ScratchTarget(target, lang)
        );
    }

    /** Returns every target, including the stage. */
    getTargets(): readonly ScratchTarget[] {
        return this.targets;
    }

    /** Finds a stage or sprite by its name. */
    getTarget(name: string): ScratchTarget | undefined {
        return this.targets.find(target => target.name === name);
    }
}

/** The stage or a sprite in a Scratch project. */
export class ScratchTarget {

    readonly name: string;
    readonly isStage: boolean;
    private readonly scripts: readonly ScratchScript[];

    constructor(json: any, lang: LanguageCode) {
        this.name = json.name;
        this.isStage = json.isStage;
        this.scripts = Object.keys(json.blocks)
            .filter(id => json.blocks[id].topLevel)
            .map(id => new ScratchScript(
                this,
                json.blocks[id].opcode,
                {
                    id,
                    blocks: json.blocks,
                },
                lang
            ));
    }

    /** Returns the scripts that start on this target. */
    getScripts(): readonly ScratchScript[] {
        return this.scripts;
    }
}

/** One top-level script and the blocks connected to it. */
export class ScratchScript {

    constructor(
        readonly target: ScratchTarget,
        readonly opcode: string,
        readonly sb3Json: {
            readonly id: string;
            readonly blocks: any;
        },
        private readonly lang: LanguageCode
    ) { }

    /** Checks if `opcode` is part of the complete script. */
    contains(opcode: string): boolean {
        const stack = [this.sb3Json.id];
        const visited = new Set<string>();

        while (stack.length > 0) {
            const id = stack.pop()!;

            if (visited.has(id)) {
                continue;
            }

            visited.add(id);
            const block = this.sb3Json.blocks[id];

            if (block.opcode === opcode) {
                return true;
            }

            if (block.next) {
                stack.push(block.next);
            }

            this.pushChildren(id, stack);
        }

        return false;
    }

    /** Converts this script to scratchblocks syntax. */
    toScratchblocks(lang: LanguageCode = this.lang): string {
        return toScratchblocks(
            this.sb3Json.id,
            this.sb3Json.blocks,
            lang
        );
    }

    private pushChildren(id: string, stack: string[]): void {
        const inputs = this.sb3Json.blocks[id].inputs;

        // An input can point to a block and, optionally, its shadow block.
        for (const name of Object.keys(inputs)) {
            const input = inputs[name];

            for (const value of input.slice(1)) {
                if (typeof value === "string" && this.sb3Json.blocks[value]) {
                    stack.push(value);
                }
            }
        }
    }
}

/** Opens SB3 data and reads its project.json file. */
export async function readSB3(
    data: ArrayBuffer,
    lang: LanguageCode = "en"
): Promise<ScratchProject> {
    const archive = await JSZip.loadAsync(data);
    const projectFile = archive.file("project.json");

    if (!projectFile) {
        throw new Error("The SB3 archive does not contain project.json");
    }

    const json = JSON.parse(await projectFile.async("string"));
    return new ScratchProject(json, lang);
}
