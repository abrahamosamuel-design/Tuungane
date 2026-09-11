import dns from 'dns';
import util from 'util';

const resolve = util.promisify(dns.resolve);
async function run() {
  try {
    const ipv6 = await resolve('db.bvlbirgazcdibhnawrok.supabase.co', 'AAAA');
    console.log('IPv6:', ipv6);
  } catch (e) {
    console.error('AAAA failed:', e.message);
  }
  try {
    const ipv4 = await resolve('db.bvlbirgazcdibhnawrok.supabase.co', 'A');
    console.log('IPv4:', ipv4);
  } catch (e) {
    console.error('A failed:', e.message);
  }
}
run();
