const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

// Print Supabase keys in env
console.log('Available Env Variables:');
Object.keys(process.env).forEach(key => {
  if (key.includes('SUPABASE') || key.includes('KEY')) {
    console.log(`- ${key}: ${process.env[key] ? 'DEFINED (length: ' + process.env[key].length + ')' : 'UNDEFINED'}`);
  }
});
