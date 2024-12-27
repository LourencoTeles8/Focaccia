import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const API_FOOTBALL_BASE_URL = process.env.API_FOOTBALL_BASE_URL;
const API_KEY = process.env.API_FOOTBALL_KEY;

export async function getTeamsByName(name) {
    if (!API_KEY) {
        throw new Error("API Football key is missing. Set it in your environment variables.");
    }

    const url = `${API_FOOTBALL_BASE_URL}/teams?name=${encodeURIComponent(name)}`;
    const options = {
        method: 'GET',
        headers: {
            'x-apisports-key': API_KEY,
        },
    };

    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`API Football request failed with status ${response.status}`);
    }

    return response.json(); // Return JSON response
}

export async function getLeaguesByTeam(name) {
    // Get the team details by name
    const teamData = await getTeamsByName(name);

    // Ensure the response is valid and contains the team data
    if (!teamData || !teamData.response || teamData.response.length === 0) {
        throw new Error('Team not found for the given name.');
    }

    // Extract the team ID from the response
    const teamId = teamData.response[0].team.id;
    
    const url = `${process.env.API_FOOTBALL_BASE_URL}/leagues?team=${teamId}`;
    const options = {
        method: 'GET',
        headers: {
            'x-apisports-key': process.env.API_FOOTBALL_KEY
        }
    };

    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`API Football Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

export async function getTeamDetails(teamId) {
    const url = `${API_FOOTBALL_BASE_URL}/teams?id=${teamId}`;
    const options = {
        method: 'GET',
        headers: {
            'x-apisports-key': API_KEY,
        },
    };

    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Failed to fetch team details. Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.response || data.response.length === 0) {
        throw new Error(`No team found with ID ${teamId}`);
    }

    // Extract team and venue details from the response
    const team = data.response[0].team;
    const venue = data.response[0].venue;

    return {
        team: {
            name: team.name,
        },
        venue: {
            name: venue.name,
        },
    };
}

export async function getLeagueDetails(leagueId) {
    const url = `${API_FOOTBALL_BASE_URL}/leagues?id=${leagueId}`;
    const options = {
        method: 'GET',
        headers: {
            'x-apisports-key': API_KEY,
        },
    };

    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Failed to fetch league details. Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.response || data.response.length === 0) {
        throw new Error(`No league found with ID ${leagueId}`);
    }

    // Extract league name from the response
    const league = data.response[0].league;

    return {
        name: league.name,
    };
}

export async function getTeamDetailsByName(teamName) {
    try {
        // Fetch team details by name
        const teamResponse = await getTeamsByName(teamName);

        if (!teamResponse.response || teamResponse.response.length === 0) {
            throw new Error('Team not found');
        }

        const team = teamResponse.response[0]; 

        // Fetch leagues for the team
        const leaguesResponse = await getLeaguesByTeam(team.team.name);
        const leagues = leaguesResponse.response.map((league) => ({
            leagueName: league.league.name,
            season: league.season
        }));

        // Build the response object
        return {
            teamName: team.team.name,
            teamid: team.team.id,
            teamImage: team.team.logo,
            stadiumName: team.venue.name,
            leagues
        };
    } catch (error) {
        console.error('Error fetching team details:', error.message);
        throw new Error(error.message || 'Failed to fetch team details');
    }
}

export async function getLeaguesByName(name) {
    if (!API_KEY) {
        throw new Error("API Football key is missing. Set it in your environment variables.");
    }

    const url = `${API_FOOTBALL_BASE_URL}/leagues?name=${encodeURIComponent(name)}`;
    const options = {
        method: 'GET',
        headers: {
            'x-apisports-key': API_KEY,
        },
    };

    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`API Football request failed with status ${response.status}`);
    }

    return response.json(); // Return JSON response
}

