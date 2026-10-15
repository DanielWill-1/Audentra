// Verify only the local Docker database and disposable local scratch databases.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../..');
const container = 'supabase_db_VoiceForm';
const migration = '20261015170000_p5_legacy_schema_alignment.sql';
const tables = "('users','templates','template_shares','template_reviews','scheduled_events','filled_templates')";
const sections = {
  tables: `SELECT c.relname AS name,c.relrowsecurity AS rls,c.relforcerowsecurity AS forced
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ${tables} ORDER BY c.relname`,
  columns: `SELECT c.relname AS table,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,
    a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid) AS default,a.attgenerated,a.attidentity
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relname IN ${tables} AND a.attnum>0 AND NOT a.attisdropped
    ORDER BY c.relname,a.attname`,
  constraints: `SELECT c.relname AS table,k.conname AS name,k.contype,
    pg_get_constraintdef(k.oid,true) AS definition FROM pg_constraint k
    JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ${tables} ORDER BY c.relname,k.conname`,
  indexes: `SELECT tablename,indexname,indexdef FROM pg_indexes
    WHERE schemaname='public' AND tablename IN ${tables} ORDER BY tablename,indexname`,
  policies: `SELECT tablename,policyname,cmd,roles,qual,with_check FROM pg_policies
    WHERE schemaname='public' AND tablename IN ${tables} ORDER BY tablename,policyname`,
  triggers: `SELECT c.relname AS table,t.tgname,pg_get_triggerdef(t.oid,true) AS definition
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    AND c.relname IN ${tables} AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
  functions: `SELECT p.proname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
    AND left(p.proname,3)='p5_' ORDER BY p.proname,p.oid::regprocedure::text`,
  grants: `SELECT grantee,table_name,privilege_type,is_grantable FROM information_schema.role_table_grants
    WHERE table_schema='public' AND table_name IN ${tables}
    AND grantee IN ('PUBLIC','anon','authenticated','service_role')
    ORDER BY grantee,table_name,privilege_type`,
  column_grants: `SELECT grantee,table_name,column_name,privilege_type,is_grantable
    FROM information_schema.role_column_grants WHERE table_schema='public' AND table_name IN ${tables}
    AND grantee='authenticated' AND privilege_type='UPDATE'
    ORDER BY table_name,column_name,privilege_type`,
  storage_policies: `SELECT policyname,cmd,roles,qual,with_check FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'template_files_%'
    ORDER BY policyname`,
  bucket: `SELECT id,name,public,file_size_limit,
    ARRAY(SELECT unnest(allowed_mime_types) ORDER BY 1) AS allowed_mime_types
    FROM storage.buckets WHERE id='template-files'`,
  legacy_auth_trigger: `SELECT tgname FROM pg_trigger
    WHERE tgrelid='auth.users'::regclass AND tgname='on_auth_user_created'`,
};

function sql(database, input) {
  if (database !== 'postgres' && !/^p5_alignment_[a-f0-9]+_(baseline|replay)$/.test(database)) {
    throw new Error('Refusing an unexpected local database name');
  }
  return execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres',
    '-d', database, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'],
  { input, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n'); }
function catalog(database) {
  const entries = Object.entries(sections).map(([key, query]) =>
    `'${key}',(SELECT COALESCE(jsonb_agg(to_jsonb(row)), '[]'::jsonb) FROM (${query}) row)`);
  return JSON.parse(sql(database, `BEGIN READ ONLY; SET LOCAL search_path=public;
    SELECT jsonb_build_object(${entries.join(',')}); ROLLBACK;`));
}
function canonical(value) { return JSON.stringify(value).replace(/\\r\\n/g, '\\n'); }
function compare(expected, actual) {
  const comparisons = Object.keys(sections).map(area => ({ area,
    expected_count: expected[area].length, actual_count: actual[area].length,
    pass: canonical(expected[area]) === canonical(actual[area]),
  }));
  if (comparisons.some(row => !row.pass)) {
    throw new Error(`Catalog mismatch: ${JSON.stringify(comparisons.filter(row => !row.pass))}`);
  }
  return comparisons;
}

const scratchOnly = process.argv.includes('--scratch-only');
const localOnly = process.argv.includes('--local-only');
if (scratchOnly && localOnly) throw new Error('Choose one verification mode');
const suffix = crypto.randomBytes(5).toString('hex');
const scratchRole = `p5_alignment_${suffix}_data`;
const scratchSQL = text => text.replace(/\bdjango_data\b/g, scratchRole);
const created = [];
let roleCreated = false;
const checks = [];
const result = { status: 'running', captured_at: new Date().toISOString(), container,
  boundary: 'Local Docker only; hosted project untouched. Scratch fixtures are synthetic.', checks };
try {
  sql('postgres', `CREATE ROLE ${scratchRole} NOLOGIN NOINHERIT;`);
  roleCreated = true;
  sql('postgres', `GRANT ${scratchRole} TO postgres WITH INHERIT FALSE, SET TRUE;`);
  function create(kind) {
    const name = `p5_alignment_${suffix}_${kind}`;
    sql('postgres', `CREATE DATABASE ${name};`);
    created.push(name);
    // Platform roles already exist. Use a disposable connector role for this suite.
    const platform = read('migration/django/scripts/p5_native_scratch_platform.sql');
    sql(name, platform.slice(platform.indexOf('CREATE SCHEMA auth;')));
    sql(name, read('migration/django/scripts/p5_native_scratch_storage.sql'));
    return name;
  }
  const baseline = create('baseline');
  sql(baseline, scratchSQL(read('supabase/baseline/00000000000000_baseline.sql')));
  sql(baseline, read('supabase/storage/template_files_policies.sql'));
  sql(baseline, read('supabase/migrations/20261011150000_p5_share_role_bounds.sql'));
  const expected = catalog(baseline);
  const alignment = read(`supabase/migrations/${migration}`);
  sql(baseline, alignment);
  compare(expected, catalog(baseline));
  checks.push('canonical baseline remains unchanged');

  if (!localOnly) {
    const replay = create('replay');
    const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort();
    for (const file of migrations.filter(f => f < migration)) sql(replay, scratchSQL(read(`supabase/migrations/${file}`)));
    const legacy = catalog(replay);
    if (legacy.columns.length !== 58 || legacy.policies.length !== 24) throw new Error('Legacy drift was not reproduced');
    checks.push('fresh historical replay reproduces 58-column/24-policy drift');

    const body = alignment.replace(/^BEGIN;\s*$/m, '').replace(/^COMMIT;\s*$/m, '');
    for (const [fixture, expectedError] of [
      ["INSERT INTO public.users(id,email) VALUES ('11111111-1111-4111-8111-111111111111','mismatch@example.invalid');", 'Legacy profile email differs from Auth'],
      ["UPDATE auth.users SET email='same@example.invalid' WHERE id='11111111-1111-4111-8111-111111111111'; INSERT INTO public.users(id,email,first_name) VALUES ('11111111-1111-4111-8111-111111111111','same@example.invalid',NULL);", 'contains null values'],
    ]) {
      let rejected = false;
      try { sql(replay, `BEGIN; ${fixture}\n${body}\nROLLBACK;`); }
      catch (error) { rejected = String(error.stderr).includes(expectedError); }
      if (!rejected) throw new Error(`Expected data-preservation guard: ${expectedError}`);
      compare(legacy, catalog(replay));
    }
    checks.push('email mismatch and incompatible NULL data abort without schema changes');

    sql(replay, alignment);
    compare(expected, catalog(replay));
    sql(replay, alignment);
    compare(expected, catalog(replay));
    checks.push('full migration replay matches baseline; alignment is idempotent');
    for (const file of ['20261011100000_p5_reconcile.sql', '20261011150000_p5_share_role_bounds.sql', migration]) {
      sql(replay, scratchSQL(read(`supabase/migrations/${file}`)));
    }
    compare(expected, catalog(replay));
    checks.push('P5 reconciliation and forward alignment can be reapplied together');

    const policyChecks = scratchSQL(read('migration/django/scripts/p5_native_rls_checks.sql'));
    sql(replay, policyChecks);
    compare(expected, catalog(replay));
    checks.push('owner/share/review/private-object RLS assertions pass with rolled-back fixtures');
  }
  if (!scratchOnly) {
    result.local_comparison = compare(expected, catalog('postgres'));
    result.local_migration_recorded = sql('postgres',
      "SELECT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261015170000');") === 't';
    if (!result.local_migration_recorded) throw new Error('Local migration history is missing the alignment');
    result.local_application_row_counts = JSON.parse(sql('postgres', `SELECT jsonb_build_object(
      ${['users', 'templates', 'template_shares', 'template_reviews', 'scheduled_events', 'filled_templates']
        .map(table => `'${table}',(SELECT count(*) FROM public.${table})`).join(',')});`));
    checks.push('running local application and private Storage catalog match the canonical baseline');
  }
  result.status = 'pass';
} catch (error) {
  result.status = 'fail';
  result.error = String(error.stderr || error.message).trim();
  process.exitCode = 1;
} finally {
  result.scratch_cleanup = [];
  for (const name of created.reverse()) {
    try { sql('postgres', `DROP DATABASE ${name};`); result.scratch_cleanup.push({ kind: name.endsWith('_baseline') ? 'baseline' : 'replay', removed: true }); }
    catch { result.status = 'fail'; result.scratch_cleanup.push({ removed: false }); process.exitCode = 1; }
  }
  if (roleCreated) {
    try { sql('postgres', `DROP ROLE ${scratchRole};`); result.scratch_role_removed = true; }
    catch { result.status = 'fail'; result.scratch_role_removed = false; process.exitCode = 1; }
  }
  console.log(JSON.stringify(result, null, 2));
}
