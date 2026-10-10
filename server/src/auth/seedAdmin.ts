import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedAdminByEmail } from './claims.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server root or parent
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  let targetEmail: string | undefined = args[0]?.trim();

  if (!targetEmail) {
    targetEmail = process.env.INITIAL_ADMIN_EMAIL?.trim();
  }

  if (!targetEmail) {
    console.error('❌ Error: No email address provided.');
    console.log('\nUsage:');
    console.log('  npm run seed:admin <email>');
    console.log('  Example: npm run seed:admin coach@therovers.local\n');
    console.log('Or define INITIAL_ADMIN_EMAIL in server/.env\n');
    process.exit(1);
  }

  console.log('----------------------------------------------------');
  console.log('⚽ SubShuffle - Initial Admin Bootstrapper (RBAC)');
  console.log('----------------------------------------------------');
  console.log(`Target Email: ${targetEmail}`);
  console.log('Assigning Firebase Custom Claim: { role: "owner" } ...\n');

  try {
    const adminUser = await seedAdminByEmail(targetEmail);
    console.log('🎉 SUCCESS! Owner claim successfully provisioned:');
    console.log(`   • UID:          ${adminUser.uid}`);
    console.log(`   • Email:        ${adminUser.email}`);
    console.log(`   • Role:         ${adminUser.role}`);
    console.log(`   • Display Name: ${adminUser.displayName || 'N/A'}`);
    console.log('\nWhen this user next logs in or refreshes their ID token (getIdToken(true)),');
    console.log('their JWT will carry the claim: { "role": "owner" }.\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Failed to assign owner claim:', err?.message || err);
    process.exit(1);
  }
}

main();
