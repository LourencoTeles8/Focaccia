import fetch from 'node-fetch';

const ELASTICSEARCH_URL = 'http://localhost:9200';

async function initializeDatabase() {
    const groupsMapping = {
        mappings: {
            properties: {
                id: { type: 'keyword' },
                name: { type: 'text' },
                description: { type: 'text' },
                token: { type: 'keyword' },
                teams: {
                    type: 'nested',
                    properties: {
                        teamId: { type: 'keyword' },
                        teamName: { type: 'text' },
                        stadiumName: { type: 'text' },
                        leagueName: { type: 'text' },
                        season: { type: 'integer' },
                    },
                },
            },
        },
    };

    const usersMapping = {
        mappings: {
            properties: {
                username: { type: 'keyword' },
                token: { type: 'keyword' },
            },
        },
    };

    try {
        await fetch(`${ELASTICSEARCH_URL}/groups`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(groupsMapping),
        });

        await fetch(`${ELASTICSEARCH_URL}/users`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(usersMapping),
        });

        console.log('Database initialized successfully.');
    } catch (error) {
        console.error('Error initializing database:', error.message);
    }
}

initializeDatabase();
