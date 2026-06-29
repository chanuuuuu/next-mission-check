import type { Metadata } from "next";
import { sql } from "@/lib/db";

export const dynamic = 'force-dynamic';
import type { Team } from "@/types/seating";
import { buildJinUnits } from "../seat-manage/utils/jinGrouping";
import PCClient from "./PCClient";

export const metadata: Metadata = { title: "좌석 배치 현황 · PC뷰" };

export default async function SeatViewPage() {
  const teams = (await sql`
    SELECT
      t.id,
      t.church_id,
      c.name         AS church_name,
      c.team_name,
      c.team_type,
      c.jin_name,
      t.headcount,
      t.accumulated_score
    FROM teams t
    JOIN churches c ON t.church_id = c.id
    ORDER BY t.accumulated_score ASC
  `) as Team[];

  const [latestPhase] = (await sql`
    SELECT id, assignment_mode FROM phases ORDER BY phase_number DESC LIMIT 1
  `) as { id: number; assignment_mode: "team" | "jin" }[];

  let assignments: Record<string, number> = {};

  if (latestPhase) {
    if (latestPhase.assignment_mode === "jin") {
      const rows = (await sql`
        SELECT jin_name, assigned_seats
        FROM seat_assignments
        WHERE phase_id = ${latestPhase.id}
      `) as { jin_name: string; assigned_seats: string[] }[];

      const jinUnits = buildJinUnits(teams);
      const idMap = new Map(jinUnits.map((u) => [u.jinName, u.syntheticId]));

      for (const row of rows) {
        const synId = idMap.get(row.jin_name) ?? -1;
        for (const key of row.assigned_seats) assignments[key] = synId;
      }

      const syntheticTeams = jinUnits.map((u) => ({
        id: u.syntheticId,
        church_id: -1,
        church_name: u.jinName,
        team_name: null,
        team_type: u.team_type,
        jin_name: u.jinName,
        headcount: u.headcount,
        accumulated_score: u.accumulated_score,
      }));

      return <PCClient teams={syntheticTeams} assignments={assignments} />;
    } else {
      const rows = (await sql`
        SELECT team_id, assigned_seats
        FROM seat_assignments
        WHERE phase_id = ${latestPhase.id}
      `) as { team_id: number; assigned_seats: string[] }[];

      for (const row of rows) {
        for (const key of row.assigned_seats) assignments[key] = row.team_id;
      }
    }
  }

  return <PCClient teams={teams} assignments={assignments} />;
}
