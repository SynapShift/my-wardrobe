import { describe, expect, it } from "vitest";
import { createZipBlob } from "./zip";

const readUint32 = (bytes: Uint8Array, offset: number) =>
  bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);

describe("createZipBlob", () => {
  it("creates a zip with local and end-of-central-directory records", async () => {
    const zip = await createZipBlob([
      { data: new Blob(["hello"]), name: "images/hello.txt" },
      { data: new Blob(['{"ok":true}']), name: "manifest.json" },
    ]);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    const text = new TextDecoder().decode(bytes);

    expect(zip.type).toBe("application/zip");
    expect(readUint32(bytes, 0)).toBe(0x04034b50);
    expect(readUint32(bytes, bytes.length - 22)).toBe(0x06054b50);
    expect(text).toContain("images/hello.txt");
    expect(text).toContain("manifest.json");
  });
});
