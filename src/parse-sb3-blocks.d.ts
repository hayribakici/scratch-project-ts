declare module "parse-sb3-blocks" {
    export function toScratchblocks(
        scriptStart: string,
        blocks: any,
        locale: string
    ): string;
}
