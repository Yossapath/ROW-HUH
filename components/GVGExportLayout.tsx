import React, { forwardRef } from "react";
import { JOB_ICONS } from "@/lib/utils";

type Member = { id: string; name: string; job: string; power: number };
type Column = { id: string; title: string; memberIds: (string | null)[]; type: "main" | "sub" | "unassigned"; locked: boolean };
type Zone = { id: string; name: string; type: "main" | "sub"; teamOrder: string[] };

interface GVGExportLayoutProps {
  zones: Zone[];
  columns: Record<string, Column>;
  members: Record<string, Member>;
  title?: string;
  computedTitles?: Record<string, string>; // Maps colId to its actual calculated title
}

const GVGExportLayout = forwardRef<HTMLDivElement, GVGExportLayoutProps>(
  ({ zones, columns, members, title, computedTitles }, ref) => {
    // Filter out empty zones
    const activeZones = zones.filter(
      (z) => z.teamOrder.some((colId) => columns[colId])
    );

    const CANVAS_W = 1600; // Wider to prevent name truncation
    const PAD = 48;

    return (
      <div
        ref={ref}
        style={{
          background: "transparent",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "40px",
        }}
      >
        {activeZones.map((zone) => {
          let totalPlayers = 0;
          let totalPower = 0;
          const activeTeamIds = zone.teamOrder.filter(colId => columns[colId]);
          const numTeams = activeTeamIds.length;

          activeTeamIds.forEach(colId => {
            const col = columns[colId];
            if (col) {
              col.memberIds.forEach(id => {
                if (id && members[id]) {
                  totalPlayers++;
                  totalPower += members[id].power || 0;
                }
              });
            }
          });

          // Dynamic grid columns to balance (e.g. 4 teams -> 2x2 instead of 3x1)
          const gridCols = (numTeams === 4 || numTeams === 2) ? 2 : 3;

          return (
            <div
              key={zone.id}
              className="export-zone-canvas"
              style={{
                width: CANVAS_W + "px",
                background: "#2b2d31", // Discord embed background color
                padding: PAD + "px",
                boxSizing: "border-box",
                fontFamily: "'Segoe UI', 'Noto Sans Thai', sans-serif",
                display: "flex", 
                flexDirection: "column", 
                gap: "24px",
                borderRadius: "16px",
              }}
            >
              {/* Zone Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1px solid #3f4147", paddingBottom: "16px" }}>
                <div>
                  <div style={{ color: "#ffffff", fontSize: "36px", fontWeight: "bold", lineHeight: 1.2 }}>{zone.name}</div>
                </div>
                <div style={{ color: "#b5bac1", fontSize: "20px", fontWeight: "600", lineHeight: 1.2 }}>
                  {totalPlayers}/{numTeams * 5} ที่นั่ง &middot; อุปกรณ์รวม {totalPower.toLocaleString()}
                </div>
              </div>

              {/* Teams Grid */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`, 
                gap: "32px" 
              }}>
                {activeTeamIds.map((colId) => {
                  const col = columns[colId];
                  if (!col) return null;

                  const teamTotalPower = col.memberIds.reduce(
                    (sum, id) => sum + (id && members[id] ? members[id].power || 0 : 0),
                    0
                  );

                  const displayTitle = computedTitles && computedTitles[colId] ? computedTitles[colId] : col.title;

                  return (
                    <div key={colId} style={{
                      background: "#1e1f22", // Darker card background (Discord chat background)
                      borderRadius: "12px",
                      padding: "24px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      border: "1px solid #282a2e",
                    }}>
                      {/* Team Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", alignItems: "center" }}>
                        <span style={{ fontSize: "26px", fontWeight: "900", color: "#f2f3f5", lineHeight: 1.2 }}>{displayTitle}</span>
                        <span style={{ fontSize: "20px", color: "#b5bac1", fontWeight: "600", lineHeight: 1.2 }}>{teamTotalPower.toLocaleString()}</span>
                      </div>

                      {/* Team Members */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {col.memberIds.map((memberId, idx) => {
                          const m = memberId ? members[memberId] : null;
                          return (
                            <div key={idx} style={{ display: "flex", alignItems: "center", minHeight: "36px" }}>
                              {m ? (
                                <>
                                  {JOB_ICONS[m.job] ? (
                                    <div style={{ width: "28px", height: "28px", marginRight: "16px", display: "flex", alignItems: "center", justifyItems: "center" }}>
                                      <img src={JOB_ICONS[m.job]} alt={m.job} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                    </div>
                                  ) : (
                                    <div style={{ width: "28px", height: "28px", marginRight: "16px", background: "#3f4147", borderRadius: "4px" }}></div>
                                  )}
                                  <span style={{ 
                                    flex: 1, 
                                    fontSize: "22px", 
                                    fontWeight: "700", 
                                    color: "#ffffff", 
                                    whiteSpace: "nowrap", 
                                    overflow: "hidden", 
                                    textOverflow: "ellipsis",
                                    marginRight: "16px",
                                    lineHeight: 1.2,
                                    paddingBottom: "2px"
                                  }}>
                                    {m.name}
                                  </span>
                                  <span style={{ fontSize: "20px", fontWeight: "600", color: "#dbdee1", lineHeight: 1.2 }}>
                                    {m.power.toLocaleString()}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div style={{ width: "28px", height: "28px", marginRight: "16px" }}></div>
                                  <span style={{ flex: 1, fontSize: "22px", fontWeight: "600", color: "#4e5058", lineHeight: 1.2 }}>- ว่าง -</span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

GVGExportLayout.displayName = "GVGExportLayout";
export default GVGExportLayout;