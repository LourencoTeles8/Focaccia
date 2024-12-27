import { getTeamDetails, getLeagueDetails } from './fapi-teams-data.mjs';
import crypto from 'crypto';

const groups = new Map(); // Key: groupId, Value: group object (stores all groups)
const users = new Map(); // Key: username, Value: { username, token } (stores all users)

/*
 * Creates a new group.
 *
 * @param {string} name - Name of the group.
 * @param {string} description - Description of the group.
 * @param {string} token - Authentication token.
 * @returns {object} The created group object.
 */
export function createGroup(name, description, token) {

    const groupId = `group-${Date.now()}`;
    const group = {
        id: groupId,
        name,
        description,
        token,
        teams: [],
    };

    groups.set(groupId, group);
    return group;
}

/*
 * Deletes a group by its ID.
 *
 * @param {string} groupId - The unique ID of the group to delete.
 * @param {string} token - Authentication token.
 * @throws {Error} If the group does not exist or the token is invalid.
 */
export function deleteGroup(token, groupId) {
    isTokenInGroup(groupId, token);
    groups.delete(groupId);
}

/*
 * Add a team to a group.
 *
 * @param {string} groupId - The unique ID of the group.
 * @param {number} teamId - The ID of the team to add.
 * @param {number} leagueId - The ID of the league associated with the team.
 * @param {number} season - The season the team is associated with.
 * @param {string} token - Authentication token.
 * @returns {object} The updated group object.
 * @throws {Error} If the group does not exist, the team is already added, or fetching details fails.
 */
export async function addTeamToGroup(groupId, teamId, leagueId, season, token) {
    isTokenInGroup(groupId, token);
    const group = groups.get(groupId);

    const teamExists = group.teams.some((team) => team.teamId === teamId);
    if (teamExists) {
        throw new Error('Team is already in the group');
    }

    const teamDetails = await getTeamDetails(teamId);
    const leagueDetails = await getLeagueDetails(leagueId);

    if (!teamDetails || !leagueDetails) {
        throw new Error('Failed to fetch team or league details');
    }

    const teamData = {
        teamId,
        teamName: teamDetails.team.name,
        stadiumName: teamDetails.venue.name,
        leagueName: leagueDetails.name,
        season,
    };

    group.teams.push(teamData);
    return group;
}

/*
 * Remove a team from a group.
 *
 * @param {string} groupId - The unique ID of the group.
 * @param {number} teamId - The ID of the team to remove.
 * @param {string} token - Authentication token.
 * @returns {object} The updated group object.
 * @throws {Error} If the group or team does not exist or the token is invalid.
 */
export async function removeTeamFromGroup(groupId, teamId, token) {
    isTokenInGroup(groupId, token);
    const group = groups.get(groupId);

    const teamIndex = group.teams.findIndex((team) => team.teamId === teamId);
    if (teamIndex === -1) {
        throw new Error('Team not found in the group');
    }

    group.teams.splice(teamIndex, 1);
    return group;
}

/*
 * Edit the name and description of an existing group.
 *
 * @param {string} groupId - The unique ID of the group to edit.
 * @param {string} name - The new name for the group.
 * @param {string} description - The new description for the group.
 * @param {string} token - Authentication token.
 * @returns {object} The updated group object.
 * @throws {Error} If the group does not exist or the token is invalid.
 */
export async function editGroup(groupId, name, description, token) {
    isTokenInGroup(groupId, token);
    const group = groups.get(groupId);

    group.name = name;
    group.description = description;
    groups.set(groupId, group);

    return { ...group };
}

/*
 * List all groups associated with a specific token.
 *
 * @param {string} token - The token to filter groups by.
 * @returns {Array<object>} An array of group objects associated with the token.
 * @throws {Error} If the token is invalid.
 */
export function listGroups(token) {
    return Array.from(groups.values()).filter((group) => group.token === token);
}

/*
 * Get the details of a specific group by its ID.
 *
 * @param {string} groupId - The unique ID of the group.
 * @param {string} token - Authentication token.
 * @returns {object} The details of the specified group.
 * @throws {Error} If the group does not exist or the token is invalid.
 */
export async function getGroupDetails(groupId, token) {
    isTokenInGroup(groupId, token);
    const group = groups.get(groupId);

    return {
        name: group.name,
        description: group.description,
        teams: group.teams,
    };
}

/*
 * Register a new user with a unique username and token.
 *
 * @param {string} name - The username of the new user.
 * @returns {object} The created user object with a name and token.
 * @throws {Error} If the username is already in use.
 */
export function newUsers(name) {
    if (users.has(name)) {
        throw new Error('Name already in use!');
    }

    const userId = crypto.randomUUID();
    users.set(name, userId);

    return { name, userId };
}

/*
 * Authenticate a token and return the associated username.
 *
 * @param {string} token - The token to validate.
 * @returns {string} The username associated with the token.
 * @throws {Error} If the token is invalid or missing.
 */
export function authenticateToken(token) {
    for (const [username, usertoken] of users.entries()) {
        if (usertoken === token) {
            return username;
        }
    }

    throw new Error('Invalid or missing token');
}

/*
 * Validate if the token is associated with the specified group.
 *
 * @param {string} groupId - The ID of the group to validate.
 * @param {string} token - The token to validate.
 * @returns {boolean} True if the token is valid for the specified group, false otherwise.
 * @throws {Error} If the group does not exist or the token is invalid.
 */
export function isTokenInGroup(groupId, token) {
    const group = groups.get(groupId);
    if (!group) {
        throw new Error('Group not found');
    }

    if (group.token !== token) {
        throw new Error('Invalid token for the specified group');
    }

    return true;
}
