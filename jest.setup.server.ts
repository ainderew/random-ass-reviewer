import { config } from 'dotenv';

// Each worker loads the test env so @/lib/env validates against the test database.
config({ path: '.env.test' });
