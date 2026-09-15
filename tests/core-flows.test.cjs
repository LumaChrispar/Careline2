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
  const library = fs.readFileSync('src/lib/careline.js', 'utf8').replace(/^import .*$/gm, '').replace(/export /g, '');
  const helpers = new Function('supabase', library + '\nreturn {rpc,signIn,normalizePhone}')(supabase);
  return new Function('create', 'supabase', 'createClient', 'rpc', 'signIn', 'normalizePhone', source)(create, supabase, createClient, helpers.rpc, helpers.signIn, helpers.normalizePhone);
}

test('phone login strips formatting consistently', async () => {
  let credentials;
  const store = loadStore('src/stores/authStore.js', { auth: { signInWithPassword: async input => { credentials = input; return { error: null }; } } });
  await store.getState().login(' +237 (677) 123-456 ', 'password');
  assert.equal(credentials.phone, '+237677123456');
});

test('staff access comes from verified server memberships, never signup metadata', async () => {
  const session = { user: { id: 'member', user_metadata: { role: 'admin', facility_id: 'spoofed' } } };
  const store = loadStore('src/stores/authStore.js', { rpc: async name => {
    assert.equal(name, 'careline_context');
    return { data: { name: 'Marie', role: 'nurse', facility_id: 'verified', memberships: [], is_operator: false } };
  } });
  await store.getState().refreshContext(session);
  assert.equal(store.getState().role, 'nurse');
  assert.equal(store.getState().user.user_metadata.facility_id, 'verified');
  assert.equal(store.getState().createStaffAccount, undefined);
});

test('a stale context response cannot restore a signed-out account', async () => {
  let resolveContext;
  const store = loadStore('src/stores/authStore.js', { rpc: () => new Promise(resolve => { resolveContext = resolve; }) });
  const pending = store.getState().refreshContext({ user: { id: 'old' } });
  await store.getState().refreshContext(null);
  resolveContext({ data: { role: 'admin', memberships: [] } });
  await pending;
  assert.equal(store.getState().user, null);
  assert.equal(store.getState().role, null);
});

test('failed context loads deny access and can be retried', async () => {
  let fail = true;
  const store = loadStore('src/stores/authStore.js', { rpc: async () => fail ? { error: { message: 'Unavailable' } } : { data: { role: 'nurse', memberships: [], name: 'Marie' } } });
  await store.getState().refreshContext({ user: { id: 'member' } });
  assert.equal(store.getState().user, null);
  assert.equal(store.getState().error, 'Unavailable');
  fail = false;
  await store.getState().refreshContext();
  assert.equal(store.getState().user.id, 'member');
  assert.equal(store.getState().error, null);
});

test('restored sessions expose role and name and unsubscribe cleanly', async () => {
  let unsubscribed = false;
  const session = { user: { id: 'real-id', user_metadata: { name: 'Amina', role: 'doctor', id: 'spoofed-id' } } };
  const store = loadStore('src/stores/authStore.js', { rpc: async () => ({ data: { name: 'Amina', role: 'doctor', memberships: [] } }), auth: {
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

test('active patient search handles complete names and removes filter syntax', async () => {
  const { searchPatients } = await import('../src/lib/patientSearch.js');
  const calls=[];
  const query={ilike:(...args)=>{calls.push(args);return query;},or:value=>{calls.push(value);return query;}};
  searchPatients(query,'  Amina Ngwa  ');
  assert.deepEqual(calls,[['first_name','%Amina%'],['last_name','%Ngwa%']]);
  calls.length=0;
  searchPatients(query,'Ngwa,%');
  assert.equal(calls[0],'first_name.ilike.%Ngwa%,last_name.ilike.%Ngwa%,phone.ilike.%Ngwa%,id.ilike.%Ngwa%');
});

test('overdue waiting tasks remain urgent and closed tasks leave the active worklist', async () => {
  const { taskBucket } = await import('../src/lib/tasks.js');
  const now=new Date('2026-09-15T12:00:00Z');
  assert.equal(taskBucket({status:'waiting',due_at:'2026-09-14T09:00:00Z'},now),'urgent');
  assert.equal(taskBucket({status:'completed',priority:'urgent',due_at:'2026-09-14T09:00:00Z'},now),'closed');
  assert.equal(taskBucket({status:'waiting',due_at:'2099-01-01T09:00:00Z'},now),'waiting');
  assert.equal(taskBucket({status:'open',due_at:'2099-01-01T09:00:00Z'},now),'upcoming');
});
