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
}

const GVGExportLayout = forwardRef<HTMLDivElement, GVGExportLayoutProps>(
  ({ zones, columns, members, title }, ref) => {
    // Filter out empty zones
    const activeZones = zones.filter(
      (z) => z.teamOrder.some((colId) => columns[colId])
    );

    const renderZone = (zone: Zone) => {
      // Find total players in this zone
      let totalPlayers = 0;
      let totalPower = 0;
      zone.teamOrder.forEach(colId => {
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

      return (
        <div key={zone.id} style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "40px" }}>
          {/* Zone Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1px solid #2d3342", paddingBottom: "12px" }}>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>โซนย่อย - Polarity Zone</div>
              <div style={{ color: "#ffffff", fontSize: "28px", fontWeight: "bold" }}>{zone.name}</div>
            </div>
            <div style={{ color: "#94a3b8", fontSize: "16px", fontWeight: "600" }}>
              {totalPlayers}/30 ที่นั่ง &middot; อุปกรณ์รวม {totalPower.toLocaleString()}
            </div>
          </div>

          {/* Teams Grid - 3 columns */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(3, 1fr)", 
            gap: "24px" 
          }}>
            {zone.teamOrder.map((colId) => {
              const col = columns[colId];
              if (!col) return null;

              const teamTotalPower = col.memberIds.reduce(
                (sum, id) => sum + (id && members[id] ? members[id].power || 0 : 0),
                0
              );

              return (
                <div key={colId} style={{
                  background: "#1e2124", // Very dark discord-like color
                  borderRadius: "16px",
                  padding: "20px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  border: "1px solid #282b30",
                }}>
                  {/* Team Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
                    <span style={{ fontSize: "22px", fontWeight: "900", color: "#ffffff" }}>{col.title}</span>
                    <span style={{ fontSize: "16px", color: "#94a3b8", fontWeight: "600" }}>{teamTotalPower.toLocaleString()}</span>
                  </div>

                  {/* Team Members */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {col.memberIds.map((memberId, idx) => {
                      const m = memberId ? members[memberId] : null;
                      return (
                        <div key={idx} style={{ display: "flex", alignItems: "center", height: "28px" }}>
                          {m ? (
                            <>
                              {JOB_ICONS[m.job] ? (
                                <div style={{ width: "24px", height: "24px", marginRight: "12px", display: "flex", alignItems: "center", justifyItems: "center" }}>
                                  <img src={JOB_ICONS[m.job]} alt={m.job} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                </div>
                              ) : (
                                <div style={{ width: "24px", height: "24px", marginRight: "12px", background: "#2d3342", borderRadius: "4px" }}></div>
                              )}
                              <span style={{ 
                                flex: 1, 
                                fontSize: "18px", 
                                fontWeight: "700", 
                                color: "#ffffff", 
                                whiteSpace: "nowrap", 
                                overflow: "hidden", 
                                textOverflow: "ellipsis",
                                marginRight: "12px"
                              }}>
                                {m.name}
                              </span>
                              <span style={{ fontSize: "16px", fontWeight: "600", color: "#e2e8f0" }}>
                                {m.power.toLocaleString()}
                              </span>
                            </>
                          ) : (
                            <>
                              <div style={{ width: "24px", height: "24px", marginRight: "12px" }}></div>
                              <span style={{ flex: 1, fontSize: "18px", fontWeight: "600", color: "#3f444c" }}>- ว่าง -</span>
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
    };

    const CANVAS_W = 1400; // Optimal width for 3 columns + padding
    const PAD = 48;

    return (
      <div
        ref={ref}
        id="gvg-export-canvas"
        style={{
          width: CANVAS_W + "px",
          background: "#161b22", // Discord-like background
          padding: PAD + "px",
          boxSizing: "border-box",
          fontFamily: "'Segoe UI', 'Noto Sans Thai', sans-serif",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ fontSize: "36px", fontWeight: "900", color: "#ffffff", letterSpacing: "1px" }}>
              {title || "LINEUP SETUP"}
            </div>
            <div style={{ padding: "6px 12px", background: "#5865F2", borderRadius: "8px", color: "#ffffff", fontSize: "16px", fontWeight: "bold" }}>
              {activeZones.length} ZONES
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#94a3b8", letterSpacing: "2px", marginBottom: "4px" }}>
              EXPORTED DATE
            </div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", fontFamily: "monospace" }}>
              {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>

        {/* ZONES LIST */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {activeZones.map((zone) => renderZone(zone))}
        </div>
      </div>
    );
  }
);

GVGExportLayout.displayName = "GVGExportLayout";
export default GVGExportLayout;