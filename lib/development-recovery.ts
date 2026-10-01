import { z } from "zod";
import { playerDetailsSchema } from "./player-details";

export const recoverySchema = z.object({ players: z.array(z.object({
  playerId: z.string().min(1).max(100), details: playerDetailsSchema,
  evidence: z.array(z.string().max(2000)).max(20)
})).min(1).max(100) });
export type Recovery = z.infer<typeof recoverySchema>;
export type RecoveryPreview = {
  revision: string;
  players: (Recovery["players"][number] & { name: string; previousDetails: unknown })[];
};
