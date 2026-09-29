export type Role = "TEAM_ADMIN" | "COACH" | "PARENT" | "PLAYER";
export const isCoach = (role: string) => role === "TEAM_ADMIN" || role === "COACH";
export const roleLabel = (role: string) => ({ TEAM_ADMIN: "Team admin", COACH: "Coach", PARENT: "Parent", PLAYER: "Player" }[role] ?? role);

export function validPlayerLinks(role: string, playerIds: string[]) {
  const count = new Set(playerIds).size;
  return role === "PLAYER" ? count === 1 : role === "PARENT" ? count >= 1 : role === "COACH" && count === 0;
}
