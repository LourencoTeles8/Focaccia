import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { findUserByUsername, createUser } from './foccacia-db.mjs';

// Configure Passport Local Strategy
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const user = await findUserByUsername(username);
            if (!user) {
                return done(null, false, { message: 'Invalid username' });
            }
            if (user.password !== password) {
                return done(null, false, { message: 'Invalid password' });
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

// Serialize user (store in session)
passport.serializeUser((user, done) => {
    done(null, { username: user.username, token: user.token });
});

// Deserialize user (retrieve from session)
passport.deserializeUser((user, done) => {
    done(null, user);
});

export default passport