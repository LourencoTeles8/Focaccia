import { searchTeamsByName, searchLeaguesByTeam, searchTeamsdetails, elasticService } from './foccacia-services.mjs';

/*
 * Registers API routes for managing teams, leagues, groups, and users.
 * 
 * @param {object} app - The Express application instance to register routes on.
 */
export function registerApiRoutes(app) {
    /*
     * GET /api/teams/search
     * Searches for teams by name using an external API.
     *
     * Query Parameters:
     * - name {string}: The name of the team to search for (required).
     *
     * Response:
     * - 200: A list of matching teams.
     * - 400: If the `name` query parameter is missing.
     * - 404: If no teams are found.
     * - 500: If an error occurs while fetching data.
     */
    app.get('/api/teams/search', async (req, res) => {
        const name = req.query.name;

        if (!name) {
            return res.status(400).json({ error: 'Team name is required' });
        }

        try {
            const data = await searchTeamsByName(name);

            if (data.response.length === 0) {
                return res.status(404).json({ error: 'No teams found with the given name' });
            }
            else if (data.response.status === 401) {
                throw new Error('Invalid API Key');
            } 
            else if (data.response.status === 429) {
                throw new Error('Rate limit exceeded. Try again later.');
            }

            res.json(data.response);
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Failed to fetch team data' });
        }
    });

     /*
     * GET /api/leagues/search
     * Searches for leagues associated with a given team ID.
     *
     * Query Parameters:
     * - teamId {string}: The ID of the team to search leagues for (required).
     *
     * Response:
     * - 200: A list of leagues.
     * - 400: If the `teamId` query parameter is missing.
     * - 404: If no leagues are found.
     * - 500: If an error occurs while fetching data.
     */
    app.get('/api/leagues/search', async (req, res) => {
        const teamId = req.query.teamId;

        if (!teamId) {
            return res.status(400).json({ error: 'Team ID is required.' });
        }

        try {
            const leagues = await searchLeaguesByTeam(teamId);

            if (!leagues.response || leagues.response.length === 0) {
                return res.status(404).json({ error: 'No leagues found for the given team.' });
            }

            res.json(leagues.response);
        } catch (err) {
            console.error('Error fetching leagues:', err.message);
            res.status(500).json({ error: 'Failed to fetch leagues.' });
        }
    });

    /*
     * GET /api/teams/details
     * Retrieves details for a specific team by its name.
     *
     * Query Parameters:
     * - name {string}: The name of the team (required).
     *
     * Response:
     * - 200: The team's details.
     * - 400: If the `name` query parameter is missing.
     * - 404: If the team is not found.
     * - 500: If an error occurs while fetching team details.
     */

    app.get('/api/teams/details', async (req, res) => {
        const name = req.query.name;

        if (!name) {
            return res.status(400).json({ error: 'Team name is required' });
        }
    
        try {
            const teamDetails = await searchTeamsdetails(name);
            res.status(200).json(teamDetails);
        } catch (error) {
            if (error.message === 'Team not found') {
                res.status(404).json({ error: error.message });
            } else {
                console.error('Error fetching team details:', error.message);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    });
    
    /*
     * POST /api/groups
     * Creates a new group with a name and description.
     * Requires user authentication via Bearer token.
     *
     * Body Parameters:
     * - name {string}: The name of the group (required).
     * - description {string}: The description of the group (required).
     *
     * Response:
     * - 201: The created group object.
     * - 400: If `name` or `description` is missing.
     * - 500: If an error occurs while creating the group.
     */
    app.post('/api/groups', requireAuth, async (req, res) => {
        const { name, description } = req.body;
        const token = gettoken(req)

    
        if (!name || !description) {
            return res.status(400).json({ error: 'Name and description are required.' });
        }
    
        try {
            const group = await elasticService.createGroup(name, description, token); // Elasticsearch-backed
            res.status(201).json(group);
        } catch (error) {
            console.error('Error creating group:', error.message);
            res.status(500).json({ error: 'Failed to create group' });
        }
    });
    

    /*
    * DELETE /api/groups/:groupId
    * Deletes a group by its unique ID.
    * Requires user authentication via Bearer token.
    * 
    * Path Parameters:
    * - groupId: The ID of the group to delete.
    * 
    * Response:
    * - 204: No content if the group was successfully deleted.
    * - 404: If the group does not exist.
    * - 500: If an error occurs while deleting the group.
    */
    app.delete('/api/groups/:groupId', requireAuth, async (req, res) => {
        const { groupId } = req.params;
        const token = gettoken(req)

    
        try {
            await elasticService.deleteGroup(token, groupId); // Elasticsearch-backed
            res.status(204).send();
        } catch (error) {
            if (error.message === 'Group not found') {
                res.status(404).json({ error: error.message });
            } else {
                console.error('Error deleting group:', error.message);
                res.status(500).json({ error: 'Failed to delete group' });
            }
        }
    });
    

    /*
 * POST /api/groups/:groupId/teams
 * Adds a team to a group.
 * Requires user authentication via Bearer token.
 * 
 * Path Parameters:
 * - groupId: The ID of the group to add the team to.
 * 
 * Body Parameters:
 * - teamId: The ID of the team to add (required).
 * - leagueId: The ID of the league associated with the team (required).
 * - season: The season the team is associated with (required).
 * 
 * Response:
 * - 200: The updated group object.
 * - 404: If the group does not exist.
 * - 409: If the team is already in the group.
 * - 500: If an error occurs while adding the team to the group.
 */
    app.post('/api/groups/:groupId/teams', requireAuth, async (req, res) => {
        const { groupId } = req.params;
        const { teamId, leagueId, season } = req.body;
        const token = gettoken(req)

    
        if (!teamId || !leagueId || !season) {
            return res.status(400).json({ error: 'Team ID, League ID, and Season are required.' });
        }
    
        try {
            const updatedGroup = await elasticService.addTeamToGroup(groupId, teamId, leagueId, season, token); // Elasticsearch-backed
            res.status(200).json(updatedGroup);
        } catch (error) {
            if (error.message === 'Group not found') {
                res.status(404).json({ error: error.message });
            } else if (error.message === 'Team is already in the group') {
                res.status(409).json({ error: error.message });
            } else {
                console.error('Error adding team to group:', error.message);
                res.status(500).json({ error: 'Failed to add team to group' });
            }
        }
    });
    
    /*
 * DELETE /api/groups/:groupId/teams/:teamId
 * Removes a team from a group.
 * Requires user authentication via Bearer token.
 * 
 * Path Parameters:
 * - groupId: The ID of the group to remove the team from.
 * - teamId: The ID of the team to remove.
 * 
 * Response:
 * - 200: The updated group object.
 * - 404: If the group or team does not exist.
 * - 500: If an error occurs while removing the team from the group.
 */
    app.delete('/api/groups/:groupId/teams/:teamId', requireAuth, async (req, res) => {
        const { groupId, teamId } = req.params;
        const token = gettoken(req)
    
        try {
            const updatedGroup = await elasticService.removeTeamFromGroup(groupId, parseInt(teamId), token); // Elasticsearch-backed
            res.status(200).json(updatedGroup);
        } catch (error) {
            if (error.message === 'Group not found' || error.message === 'Team not found in the group') {
                res.status(404).json({ error: error.message });
            } else {
                console.error('Error removing team from group:', error.message);
                res.status(500).json({ error: 'Failed to remove team from group' });
            }
        }
    });
    
/*
 * PUT /api/groups/:groupId
 * Updates a group's name and description.
 * Requires user authentication via Bearer token.
 * 
 * Path Parameters:
 * - groupId: The ID of the group to update.
 * 
 * Body Parameters:
 * - name: The new name for the group (required).
 * - description: The new description for the group (required).
 * 
 * Response:
 * - 200: The updated group object.
 * - 400: If `name` or `description` is missing in the request body.
 * - 404: If the group does not exist.
 * - 500: If an error occurs while updating the group.
 */
app.put('/api/groups/:groupId', requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const token = gettoken(req)

    if (!name || !description) {
        return res.status(400).json({ error: 'Name and description are required.' });
    }

    try {
        const updatedGroup = await elasticService.editGroup(groupId, name, description, token); // Elasticsearch-backed
        res.status(200).json(updatedGroup);
    } catch (error) {
        if (error.message === 'Group not found') {
            res.status(404).json({ error: error.message });
        } else {
            console.error('Error editing group:', error.message);
            res.status(500).json({ error: 'Failed to edit group' });
        }
    }
});

    /*
 * GET /api/groups
 * Retrieves a list of all groups.
 * Requires user authentication via Bearer token.
 * 
 * Response:
 * - 200: An array of all groups.
 * - 500: If an error occurs while fetching the list of groups.
 */
app.get('/api/groups', requireAuth, async (req, res) => {
    const token = gettoken(req)


    try {
        const groups = await elasticService.listGroups(token); // Elasticsearch-backed
        res.status(200).json(groups);
    } catch (error) {
        console.error('Error listing groups:', error.message);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

/*
 * GET /api/groups/:groupId
 * Retrieves the details of a specific group by its ID.
 * Requires user authentication via Bearer token.
 * 
 * Path Parameters:
 * - groupId: The ID of the group to retrieve.
 * 
 * Response:
 * - 200: The group's details, including name, description, and teams.
 * - 404: If the group does not exist.
 * - 500: If an error occurs while fetching the group's details.
 */
 app.get('/api/groups/:groupId', requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const token = gettoken(req)


    try {
        const groupDetails = await elasticService.getGroupDetails(groupId, token); // Elasticsearch-backed
        res.status(200).json(groupDetails);
    } catch (error) {
        if (error.message === 'Group not found') {
            res.status(404).json({ error: error.message });
        } else {
            console.error('Error fetching group details:', error.message);
            res.status(500).json({ error: 'Failed to fetch group details' });
        }
    }
});

/*
 * POST /api/users
 * Registers a new user.
 * 
 * Body Parameters:
 * - username: The username of the new user (required).
 * 
 * Response:
 * - 201: The newly created user object.
 * - 400: If the username is missing.
 * - 409: If the username is already in use.
 * - 500: If an error occurs while registering the user.
 */
    
   app.post('/api/users', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const user = await elasticService.newUsers(username); // Elasticsearch-backed
        res.status(201).json(user);
    } catch (error) {
        if (error.message === 'Name already in use!') {
            res.status(409).json({ error: 'Username already exists' });
        } else {
            console.error('Error registering user:', error.message);
            res.status(500).json({ error: 'Failed to register user' });
        }
    }
    });

}

/*
 * Middleware to validate Bearer token authentication.
 * Extracts the token from the Authorization header and verifies it using `userService.authenticateToken`.
 * 
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 * @param {function} next - The next middleware function to call.
 * 
 * Response:
 * - 401: If the Authorization header is missing or invalid, or the token cannot be authenticated.
 */
function requireAuth(req, res, next) {
    
    const token = gettoken(req)

    try {
        const user = elasticService.authenticateToken(token); // Elasticsearch-backed
        req.user = user; // Attach user to the request
        next();
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
}

function gettoken(req){
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    return authHeader.split(' ')[1];
}