import express from 'express';
import path from 'path';
import exphbs from 'express-handlebars';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import session from 'express-session';
import passport from 'passport';
import './passport-config.mjs'; // Corrected import for Passport configuration

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up Handlebars as the view engine
// Set up Handlebars with Helpers
app.engine(
    'hbs',
    exphbs.engine({
        extname: 'hbs', // Use .hbs file extensions
        helpers: {
            isActive: (path, currentPath) => (path === currentPath ? 'active' : ''), // Custom helper
        },
    })
);
app.set('view engine', 'hbs'); // Set Handlebars as the default view engine
app.set('views', path.join(__dirname, 'views')); // Define the views folder

app.use(express.static(path.join(__dirname, 'public')));


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Import and register routes
import { registerApiRoutes } from './foccacia-web-api.mjs';
import { registerWebRoutes } from './foccacia-web-site.mjs';

// Session configuration
app.use(
    session({
        secret: 'your-secret-key', // Replace with a strong secret
        resave: false,
        saveUninitialized: false,
    })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

registerApiRoutes(app);  // Register API routes
registerWebRoutes(app);  // Register web page routes


// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
