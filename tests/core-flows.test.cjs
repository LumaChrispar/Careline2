const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { create } = require('zustand');

// Execute the actual store logic against an isolated backend. No real patient data.
function loadStore(file, supabase, createClient = () => supabase) {
  const source = fs.readFileSync(file, 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/import\.meta\.env\.\w+/g, "'test-config'")
    .replace(/export default (\w+)/, 'return $1');
  return new Function('create', 'supabase', 'createClient', source)(create, supabase, createClient);
}

test('phone login strips formatting consistently', async () => {
  let credentials;
  const store = loadStore('src/stores/authStore.js', { auth: { signInWithPassword: async input => { credentials = input; return { error: null }; } } });
  await store.getState().login(' +237 (677) 123-456 ', 'password');
  assert.equal(credentials.email, '237677123456@patient.eco-medic.local');
});

test('staff signup uses a detached client and preserves admin session', async () => {
  let signup = false;
  const store = loadStore('src/stores/authStore.js', { auth: { signUp: () => { throw Error('Main session used'); } } }, (_url, _key, options) => {
    assert.equal(options.auth.persistSession, false);
    return { auth: { signUp: async () => { signup = true; return { error: null }; } } };
  });
  store.setState({ user: { id: 'admin' } });
  assert.equal((await store.getState().createStaffAccount('N', 'n@example.com', 'doctor', 'password', null)).success, true);
  assert.equal(signup, true);
  assert.equal(store.getState().user.id, 'admin');
});

test('restored sessions expose role and name and unsubscribe cleanly', async () => {
  let unsubscribed = false;
  const session = { user: { id: 'real-id', user_metadata: { name: 'Amina', role: 'doctor', id: 'spoofed-id' } } };
  const store = loadStore('src/stores/authStore.js', { auth: {
    getSession: async () => ({ data: { session } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { unsubscribed = true; } } } }),
  } });
  const stop = store.getState().initSession();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(store.getState().user.id, 'real-id');
  assert.equal(store.getState().user.role, 'doctor');
  assert.equal(store.getState().user.name, 'Amina');
  assert.equal(store.getState().isInitialized, true);
  stop();
  assert.equal(unsubscribed, true);
});

test('patient search accepts a complete name with surrounding spaces', () => {
  const store = loadStore('src/stores/patientStore.js', {});
  store.setState({ patients: [{ id: 'MT-1', first_name: 'Amina', last_name: 'Ngwa' }], searchQuery: '  amina ngwa  ' });
  assert.equal(store.getState().getFilteredPatients().length, 1);
});

test('registration without portal omits password and normalizes optional fields', async () => {
  let record;
  const store = loadStore('src/stores/patientStore.js', { from: () => ({ insert: rows => {
    record = rows[0];
    return { select: () => ({ single: async () => ({ data: record, error: null }) }) };
  } }) });
  await store.getState().addPatient({ first_name: 'Amina', last_name: 'Ngwa', password: '', blood_group: '', phone: '' });
  assert.equal('password' in record, false);
  assert.equal(record.blood_group, null);
  assert.equal(record.phone, null);
  assert.ok(record.id.startsWith('MT-'));
});

test('a pending patient fetch cannot repopulate records after logout reset', async () => {
  let resolvePatients;
  const patientRequest = new Promise(resolve => { resolvePatients = resolve; });
  const store = loadStore('src/stores/patientStore.js', { from: table => ({ select: () => table === 'patients' ? patientRequest : { order: async () => ({ data: [] }) } }) });
  const fetch = store.getState().fetchData();
  store.getState().reset();
  resolvePatients({ data: [{ id: 'previous-account-record' }] });
  await fetch;
  assert.deepEqual(store.getState().patients, []);
});
