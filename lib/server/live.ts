import { createHash } from "node:crypto";

/** Public id for a player: a hash of their install id, so install ids never leave the server. */
export const pidOf = (installId: string) => createHash("sha256").update(`abk:${installId}`).digest("hex").slice(0, 16);
