import { readFileSync } from "fs";
import JSZip from "jszip";
import path from "path";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  readSB3,
  ScratchProject,
} from "../src/project";
import { Opcode } from "../src/opcodes";

async function readTestProject(): Promise<ScratchProject> {
  const bytes = readFileSync(path.join(process.cwd(), "tests/game.sb3"));

  return readSB3(Uint8Array.from(bytes).buffer);
}

async function createSB3(projectJson?: string): Promise<ArrayBuffer> {
  const archive = new JSZip();

  if (projectJson !== undefined) {
    archive.file("project.json", projectJson);
  }

  return archive.generateAsync({ type: "arraybuffer" });
}

describe("ScratchProject", () => {
  let project: ScratchProject;

  beforeAll(async () => {
    project = await readTestProject();
  });

  it("reads a Scratch project from SB3 data", () => {
    expect(project).toBeInstanceOf(ScratchProject);
  });

  it("reads its targets", () => {
    expect(
      project.getTargets().map(({ name, isStage }) => ({ name, isStage }))
    ).toEqual([
      { name: "Stage", isStage: true },
      { name: "Crab", isStage: false },
    ]);
  });

  it("returns undefined for an unknown target", () => {
    expect(project.getTarget("Unknown")).toBeUndefined();
  });

  it("returns no scripts for an empty target", () => {
    expect(project.getTarget("Stage")?.getScripts()).toEqual([]);
  });

  it("reads scripts from a target", () => {
    const scripts = project.getTarget("Crab")?.getScripts();

    expect(scripts?.map(script => script.opcode)).toEqual([
      "event_whenflagclicked",
      "procedures_definition",
    ]);
    expect(scripts?.every(script => script.sb3Json.id)).toBe(true);
  });

  it("finds blocks contained in a script", () => {
    const script = project.getTarget("Crab")?.getScripts().find(
      script => script.opcode === Opcode.GreenFlag
    );

    expect(script?.contains(Opcode.GreenFlag)).toBe(true);
    expect(script?.contains("procedures_call")).toBe(true);
    expect(script?.contains("control_if")).toBe(true);
    expect(script?.contains("sensing_touchingobject")).toBe(true);
    expect(script?.contains("looks_sayforsecs")).toBe(true);
  });

  it("does not include blocks from another script", () => {
    const script = project.getTarget("Crab")?.getScripts().find(
      script => script.opcode === Opcode.GreenFlag
    );

    expect(script?.contains("procedures_definition")).toBe(false);
    expect(script?.contains("motion_gotoxy")).toBe(false);
    expect(script?.contains("control_repeat_until")).toBe(false);
    expect(script?.contains("unknown_opcode")).toBe(false);
  });

  it("keeps extension opcodes", () => {
    const extensionProject = new ScratchProject({
      targets: [{
        name: "Controller",
        isStage: false,
        blocks: {
          root: {
            opcode: "microcontroller_whenButtonPressed",
            next: "camera",
            parent: null,
            inputs: {},
            topLevel: true,
          },
          camera: {
            opcode: "camera_takePicture",
            next: null,
            parent: "root",
            inputs: {},
            topLevel: false,
          },
        },
      }],
    });
    const script = extensionProject
      .getTarget("Controller")
      ?.getScripts()[0];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(script?.opcode).toBe("microcontroller_whenButtonPressed");
    expect(script?.contains("camera_takePicture")).toBe(true);
    expect(script?.toScratchblocks()).toBe("");
    expect(warn).toHaveBeenCalledTimes(2);

    warn.mockRestore();
  });

  it("converts a script to Scratchblocks source", () => {
    const script = project.getTarget("Crab")?.getScripts().find(
      script => script.opcode === Opcode.GreenFlag
    );

    expect(script?.toScratchblocks()).toBe([
      "when @greenFlag clicked",
      "springe herum bis die Leertaste gedrückt wird::custom",
      "if <touching [edge v]?> then",
      "    say [Gewonnen!] for (2) seconds",
      "end",
    ].join("\n"));
  });
});

describe("readSB3", () => {
  it("rejects data that is not a ZIP archive", async () => {
    const data = new TextEncoder().encode("not a zip archive").buffer;

    await expect(readSB3(data)).rejects.toThrow();
  });

  it("rejects an archive without project.json", async () => {
    const data = await createSB3();

    await expect(readSB3(data)).rejects.toThrow(
      "The SB3 archive does not contain project.json"
    );
  });

  it("rejects invalid project JSON", async () => {
    const data = await createSB3("not json");

    await expect(readSB3(data)).rejects.toBeInstanceOf(SyntaxError);
  });
});
