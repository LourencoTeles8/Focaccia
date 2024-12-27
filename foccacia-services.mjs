/*
This file serves as a "meeting point" between the "fapi-teams-data.mjs" files and "foccacia-mem.mjs".
The "test-service.mjs" file obtains the necessary functions from this file.
*/
import { getTeamsByName, getLeaguesByTeam, getTeamDetailsByName } from './fapi-teams-data.mjs';
import { removeTeamFromGroup, authenticateToken, newUsers, createGroup, deleteGroup, editGroup, listGroups, addTeamToGroup, getGroupDetails, isTokenInGroup } from './foccacia-data-mem.mjs';


export async function searchTeamsByName(name) {
    return await getTeamsByName(name);
}

export async function searchLeaguesByTeam(teamId) {
    return await getLeaguesByTeam(teamId);
}

export async function searchTeamsdetails(name) {
    return await getTeamDetailsByName(name);
}

//Will not be used going forward.
export const groupService = {
    createGroup: (name, description, token) => createGroup(name, description, token),
    deleteGroup: (token,groupId) => deleteGroup(token,groupId),
    listGroups: (token) => listGroups(token),
    editGroup: (groupId, name, description,token) => editGroup(groupId, name, description,token),
    addTeamToGroup: (groupId, teamId, leagueId, season,token) => addTeamToGroup(groupId, teamId, leagueId, season,token),
    removeTeamFromGroup: (groupId, teamId,token) => removeTeamFromGroup(groupId, teamId,token),
    getGroupDetails: (groupId,token) => getGroupDetails(groupId,token)
};

//Will not be used going forward.
export const userService = {
    newUsers: (name) => newUsers(name),
    authenticateToken: (token) => authenticateToken(token),
    isTokenInGroup: (token) => isTokenInGroup(token)
}

export const elasticService = {
    createGroup: (name, description, token) => createGroup(name, description, token),
    deleteGroup: (token, groupId) => deleteGroup(token, groupId),
    listGroups: (token) => listGroups(token),
    editGroup: (groupId, name, description, token) => editGroup(groupId, name, description, token),
    addTeamToGroup: (groupId, teamId, leagueId, season, token) => addTeamToGroup(groupId, teamId, leagueId, season, token),
    removeTeamFromGroup: (groupId, teamId, token) => removeTeamFromGroup(groupId, teamId, token),
    getGroupDetails: (groupId, token) => getGroupDetails(groupId, token),
    newUsers: (name) => newUsers(name),
    authenticateToken: (token) => authenticateToken(token),
    isTokenInGroup: (groupId, token) => isTokenInGroup(groupId, token)
};

