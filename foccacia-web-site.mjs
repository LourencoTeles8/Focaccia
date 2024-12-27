import { getLeaguesByTeam, getLeaguesByName, getTeamDetailsByName } from './fapi-teams-data.mjs';
import { listGroups, getGroupDetails, createGroup, editGroup, deleteGroup, addTeamToGroup, removeTeamFromGroup } from './foccacia-db.mjs';
import { elasticService, searchTeamsByName, searchLeaguesByTeam } from './foccacia-services.mjs';
import passport from 'passport';
import { createUser } from './foccacia-db.mjs';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

export function registerWebRoutes(app) {
    // Home Page
    app.get('/', (req, res) => {
        res.render('pages/home', { title: 'Welcome to FOCCACIA', isAuthenticated: req.isAuthenticated() });
    });

    // Groups Page
    app.get('/groups', async (req, res) => {
        try {
            const groups = await listGroups(req.user.token); 
            res.render('pages/groups', { title: 'Groups', groups , currentPath: req.path, isAuthenticated: req.isAuthenticated()});
        } catch (error) {
            res.render('pages/groups', { title: 'Groups', error: error.message });
        }
    });

    // Create Group
    app.post('/groups', ensureAuthenticated, async (req, res) => {
        const { name, description } = req.body;
        try {
            await createGroup(name, description, req.user.token); 
            res.redirect('/groups');
        } catch (error) {
            res.render('pages/groups', { title: 'Groups', error: error.message });
        }
    });

    app.get('/groups/details/:groupId', ensureAuthenticated, async (req, res) => {
        const { groupId } = req.params;
    
        try {
            const groupDetails = await getGroupDetails(groupId, req.user.token); 
            res.render('pages/group-details', { title: `Group: ${groupDetails.name}`, id: groupId, ...groupDetails, isAuthenticated: req.isAuthenticated() });
        } catch (error) {
            res.status(404).render('pages/groups', { title: 'Groups', error: error.message });
        }
    });
    

    app.get('/groups/edit/:groupId', ensureAuthenticated, async (req, res) => {
        const { groupId } = req.params;
        try {
            const group = await getGroupDetails(groupId, req.user.token);
            res.render('pages/edit-group', { title: 'Edit Group', id: groupId, ...group, isAuthenticated: req.isAuthenticated() });
        } catch (error) {
            res.status(404).render('pages/groups', { title: 'Groups', error: error.message });
        }
    });

    app.post('/groups/edit/:groupId', ensureAuthenticated, async (req, res) => {
        const { groupId } = req.params;
        const { name, description } = req.body;

        try {
            await editGroup(groupId, name, description, req.user.token);
            res.redirect('/groups');
        } catch (error) {
            res.status(500).render('pages/edit-group', { title: 'Edit Group', error: error.message });
        }
    });

    app.post('/groups/:groupId/teams/add', ensureAuthenticated, async (req, res) => {
        const { groupId } = req.params;
        const { teamname, leaguename, season } = req.body;
    
        try {
            // Fetch league details by name
            const leagueData = await getLeaguesByName(leaguename);
            if (!leagueData || !leagueData.response || leagueData.response.length === 0) {
                throw new Error(`League '${leaguename}' not found.`);
            }
            const leagueId = leagueData.response[0].league.id;
    
            // Fetch team details by name
            const teamData = await getTeamDetailsByName(teamname);

            if (!teamData) {
                throw new Error(`Team '${teamname}' not found.`);
            }
            const teamId = teamData.teamid;
    
            // Check if the team plays in the specified league
            const teamLeagues = teamData.leagues; 
            const isInLeague = teamLeagues.some(league => league.leagueName === leagueData.response[0].league.name);
    
            if (!isInLeague) {
                throw new Error(`Team '${teamname}' does not play in the '${leaguename}' league.`);
            }
    
            // Add the team to the group
            await addTeamToGroup(groupId, teamId, leagueId, season, req.user.token);
            res.redirect(`/groups/details/${groupId}`);
            
        } catch (error) {
            console.error(error);
            res.status(500).redirect(`/groups/details/${groupId}`);
        }
    });
    
    
    app.post('/groups/:groupId/teams/delete/:teamId', ensureAuthenticated, async (req, res) => {
        const { groupId, teamId } = req.params;
    
        try {
            await removeTeamFromGroup(groupId, parseInt(teamId), req.user.token); // Replace with token handling
            res.redirect(`/groups/details/${groupId}`);
        } catch (error) {
            res.status(500).render('pages/group-details', { title: 'Group Details', error: error.message });
        }
    });

    // Delete Group
    app.post('/groups/delete/:groupId', ensureAuthenticated, async (req, res) => {
        const { groupId } = req.params;
        try {
            await deleteGroup(req.user.token, groupId); // Replace with dynamic token handling
            res.redirect('/groups');
        } catch (error) {
            res.render('pages/groups', { title: 'Groups', error: error.message });
        }
    });

    // Teams Search
    app.get('/teams', (req, res) => {
        res.render('pages/teams', { title: 'Search Teams', currentPath: req.path });
    });

    app.post('/teams/search', async (req, res) => {
        const { name } = req.body;
        try {
            const teams = await searchTeamsByName(name);
            res.render('pages/teams', { title: 'Search Teams', teams: teams.response });
        } catch (error) {
            res.render('pages/teams', { title: 'Search Teams', error: error.message });
        }
    });

    // Leagues Search
    app.get('/leagues', (req, res) => {
        res.render('pages/leagues', { title: 'Search Leagues' , currentPath: req.path});
    });

    app.post('/leagues/search', async (req, res) => {
        const { teamname } = req.body;
        try {
            const leagues = await getLeaguesByTeam(teamname);
            res.render('pages/leagues', { title: 'Search Leagues', leagues: leagues.response });
        } catch (error) {
            res.render('pages/leagues', { title: 'Search Leagues', error: error.message });
        }
    });

    app.get('*', (req, res, next) => {
        console.log('User Authenticated:', req.isAuthenticated());
        res.locals.isAuthenticated = req.isAuthenticated();
        next();
    });
    

    // Render login page
    app.get('/login', (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/'); // Redirect if already logged in
        }
        res.render('pages/login', { title: 'Login' });
    });

    // Handle login submission
    app.post('/login', (req, res, next) => {
        passport.authenticate('local', (err, user, info) => {
            if (err) {
                return res.status(500).render('pages/login', { title: 'Login', error: 'An unexpected error occurred.' });
            }
    
            if (!user) {
                return res.status(401).render('pages/login', { title: 'Login', error: info.message });
            }
    
            req.login(user, (loginErr) => {
                if (loginErr) {
                    return res.status(500).render('pages/login', { title: 'Login', error: 'Failed to log in. Please try again.' });
                }
    
                return res.redirect('/groups'); // Successful login
            });
        })(req, res, next);
    });

    // Render signup page
    app.get('/signup', (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/'); // Redirect if already logged in
        }
        res.render('pages/signup', { title: 'Sign Up' });
    });

    // Handle signup submission
    app.post('/signup', async (req, res) => {
        const { username, password } = req.body;

        try {
            const user = await createUser(username, password);
            req.login(user, (err) => {
                if (err) return next(err);
                res.redirect('/groups');
            });
        } catch (err) {
            res.status(400).render('pages/signup', {
                title: 'Sign Up',
                error: 'Username already exists',
            });
        }
    });

    // Handle logout
    app.post('/logout', (req, res) => {
        req.logout((err) => {
            if (err) return next(err);
            res.redirect('/');
        });
    });

    app.use((req, res) => {
        res.status(404).render('pages/notfound', { title: 'Page Not Found' });
    });
}
