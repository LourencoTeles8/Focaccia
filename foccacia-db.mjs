import crypto from 'crypto';
import { getTeamDetails, getLeagueDetails } from './fapi-teams-data.mjs';
import { response } from 'express';

const ELASTICSEARCH_URL = 'http://localhost:9200';

/**
 * Helper to make Elasticsearch HTTP requests.
 */
async function elasticsearchRequest(method, endpoint, body = null) {
    const url = `${ELASTICSEARCH_URL}/${endpoint}`;
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null,
    };

    const response = await fetch(url, options);
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Elasticsearch Error: ${response.status} - ${error}`);
    }

    return await response.json();
}

/**
 * Creates a new group.
 */
export async function createGroup(name, description, token) {
    const groupId = `group-${Date.now()}`;
    const group = {
        id: groupId,
        name,
        description,
        token,
        teams: [],
    };

    await elasticsearchRequest('PUT', `groups/_doc/${groupId}`, group);
    await elasticsearchRequest('POST', 'groups/_refresh')
    return group;
}

/**
 * Deletes a group by its ID.
 */
export async function deleteGroup(token, groupId) {
    const group = await getGroupById(groupId, token);
    if (group.token !== token) {
        throw new Error('Invalid token for the specified group');
    }

    await elasticsearchRequest('DELETE', `groups/_doc/${groupId}`);
    await elasticsearchRequest('POST', 'groups/_refresh')
}

/**
 * Adds a team to a group.
 */
export async function addTeamToGroup(groupId, teamId, leagueId, season, token) {
    const group = await getGroupById(groupId, token);

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

    await elasticsearchRequest('PUT', `groups/_doc/${groupId}`, group);
    return group;
}

/**
 * Removes a team from a group.
 */
export async function removeTeamFromGroup(groupId, teamId, token) {
    const group = await getGroupById(groupId, token);

    const teamIndex = group.teams.findIndex((team) => parseInt(team.teamId) === teamId);
    if (teamIndex === -1) {
        throw new Error('Team not found in the group');
    }

    group.teams.splice(teamIndex, 1);
    await elasticsearchRequest('PUT', `groups/_doc/${groupId}`, group);
    return group;
}

/**
 * Edits the name and description of a group.
 */
export async function editGroup(groupId, name, description, token) {
    const group = await getGroupById(groupId, token);

    group.name = name;
    group.description = description;

    await elasticsearchRequest('PUT', `groups/_doc/${groupId}`, group);
    await elasticsearchRequest('POST', 'groups/_refresh')
    return group;
}

/**
 * Lists all groups associated with a specific token.
 */
export async function listGroups(token) {
    const query = {
        query: {
            match: { token },
        },
    };

    const result = await elasticsearchRequest('POST', `groups/_search`, query);
    return result.hits.hits.map((hit) => hit._source);
}

/**
 * Gets the details of a specific group by its ID.
 */
export async function getGroupDetails(groupId, token) {
    const group = await getGroupById(groupId, token);
    return {
        name: group.name,
        description: group.description,
        teams: group.teams,
    };
}

/**
 * Registers a new user.
 */
export async function newUsers(name) {
    if (await userExists(name)) {
        throw new Error('Name already in use!');
    }

    const token = crypto.randomUUID();
    const user = {
        username: name,
        token,
    };
    await elasticsearchRequest('PUT', `users/_doc/${name}`, user);
    return user;
}

/**
 * Authenticates a token and returns the associated username.
 */
export async function authenticateToken(token) {
    const query = {
        query: {
            match: { token },
        },
    };

    const result = await elasticsearchRequest('POST', `users/_search`, query);
    if (result.hits.hits.length === 0) {
        throw new Error('Invalid or missing token');
    }

    const user = result.hits.hits[0]._source;
    return user.username;
}

/**
 * Validates if the token is associated with a group.
 */
export async function isTokenInGroup(groupId, token) {
    const group = await getGroupById(groupId, token);
    if (group.token !== token) {
        throw new Error('Invalid token for the specified group');
    }
    return true;
}

/**
 * Checks if a user exists in Elasticsearch.
 */
async function userExists(username) {
    try {
        const result = await elasticsearchRequest('GET', `users/_doc/${username}`);
        return result.found; // Returns true if the user exists
    } catch (error) {
        if (error.message.includes('404')) {
            return false; // Return false if the user does not exist
        }
        throw error; // Rethrow other errors
    }
}


/**
 * Helper to fetch a group by ID and validate the token.
 */
async function getGroupById(groupId, token) {
    const result = await elasticsearchRequest('GET', `groups/_doc/${groupId}`);
    const group = result._source;

    if (!group) {
        throw new Error('Group not found');
    }
    if (group.token !== token) {
        throw new Error('Invalid token for the specified group');
    }

    return group;
}


// REVER

export async function findUserByUsername(username) {
    try {
        const response = await elasticsearchRequest('GET', `users/_doc/${username}`);
        if (!response.found) return null;
        return response._source;
    } catch (error) {
        if (error.message.includes('404')) {
            return null;
        }
        throw error;
    }
}

export async function createUser(username, password) {
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
        throw new Error('User already exists');
    }
    const user = { username, password, token: generateToken() };
    await elasticsearchRequest('PUT', `users/_doc/${username}`, user);
    return user;
}

function generateToken() {
    return crypto.randomUUID();
}
