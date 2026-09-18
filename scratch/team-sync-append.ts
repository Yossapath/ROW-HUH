export function updateMemberNameInTeamsData(
  tData: any,
  oldName: string,
  newName: string
): { changed: boolean; updatedData: any } {
  if (!tData || !tData.columns || typeof tData.columns !== "object" || !oldName || !newName) {
    return { changed: false, updatedData: tData };
  }

  let changed = false;
  const updatedColumns: Record<string, any> = {};

  for (const [colId, col] of Object.entries(tData.columns)) {
    if (colId === "unassigned" || !col || typeof col !== "object" || !Array.isArray((col as any).memberIds)) {
      updatedColumns[colId] = col;
      continue;
    }

    let colChanged = false;
    const newMemberIds = [...(col as any).memberIds];
    for (let i = 0; i < newMemberIds.length; i++) {
      if (newMemberIds[i] === oldName) {
        newMemberIds[i] = newName;
        colChanged = true;
        changed = true;
      }
    }

    if (colChanged) {
      updatedColumns[colId] = {
        ...(col as any),
        memberIds: newMemberIds,
      };
    } else {
      updatedColumns[colId] = col;
    }
  }

  let updatedLegacyData = tData.data;
  if (Array.isArray(tData.data)) {
    updatedLegacyData = tData.data.map((group: any) => {
      if (!group || typeof group !== "object" || !group.teams || typeof group.teams !== "object") {
        return group;
      }
      let groupChanged = false;
      const newTeams: Record<string, any> = {};
      for (const [teamKey, teamMembers] of Object.entries(group.teams)) {
        if (Array.isArray(teamMembers as any)) {
          newTeams[teamKey] = (teamMembers as any).map((m: any) => {
            if (m && typeof m === "object" && m.name === oldName) {
              groupChanged = true;
              changed = true;
              return { ...m, name: newName };
            }
            return m;
          });
        } else {
          newTeams[teamKey] = teamMembers;
        }
      }
      return groupChanged ? { ...group, teams: newTeams } : group;
    });
  }

  let updatedOfflineIds = tData.offlineIds;
  if (Array.isArray(tData.offlineIds)) {
    if (tData.offlineIds.includes(oldName)) {
        updatedOfflineIds = tData.offlineIds.map((id: string) => id === oldName ? newName : id);
        changed = true;
    }
  }

  if (!changed) {
    return { changed: false, updatedData: tData };
  }

  return {
    changed: true,
    updatedData: {
      ...tData,
      columns: updatedColumns,
      ...(Array.isArray(tData.data) ? { data: updatedLegacyData } : {}),
      ...(updatedOfflineIds ? { offlineIds: updatedOfflineIds } : {}),
    },
  };
}
