import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'supabase', 'data', 'seed');
const EVAS_ORG_ID = '7981d385-68e5-0584-eae9-b72c419c3ed1';
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';
const MAX_BATCH_SIZE = 500;

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getConfig() {
  const envFile = parseEnvFile(path.join(ROOT_DIR, '.env'));
  const env = { ...envFile, ...process.env };

  const supabaseUrl = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const projectId = env.SUPABASE_PROJECT_ID;
  const accessToken = env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_PAT;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL in .env or process.env');
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env or process.env');
  }
  if (!projectId) {
    throw new Error('Missing SUPABASE_PROJECT_ID in .env or process.env');
  }
  if (!accessToken) {
    throw new Error('Missing SUPABASE_ACCESS_TOKEN (or SUPABASE_PAT) in .env or process.env');
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    projectId,
    accessToken,
    managementApiUrl: `https://api.supabase.com/v1/projects/${projectId}/database/query`,
  };
}

function readCsv(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const csv = fs.readFileSync(filePath, 'utf8');
  return parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function toNull(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function toNumber(value) {
  const normalized = toNull(value);
  if (normalized === null) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function toInteger(value) {
  const normalized = toNull(value);
  if (normalized === null) return null;
  const num = Number.parseInt(normalized, 10);
  return Number.isFinite(num) ? num : null;
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function parseManagementRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (Array.isArray(item?.rows)) return item.rows;
      if (Array.isArray(item?.result)) return item.result;
      if (Array.isArray(item?.data)) return item.data;
    }
    return payload;
  }
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

async function runManagementSql(config, sql, label) {
  const response = await fetch(config.managementApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    const detail = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    throw new Error(`${label} failed (${response.status}): ${detail}`);
  }

  return parsed;
}

async function postgrestBulkInsert(config, table, rows, chunkSize = MAX_BATCH_SIZE) {
  const chunks = chunkArray(rows, chunkSize);
  let done = 0;
  let okRows = 0;
  let failedRows = 0;

  for (const chunk of chunks) {
    try {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[${table}] Batch failed ${done + 1}-${done + chunk.length}: ${response.status} ${errText}`);

        for (let i = 0; i < chunk.length; i += 1) {
          const row = chunk[i];
          try {
            const rowResponse = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
              method: 'POST',
              headers: {
                apikey: config.serviceRoleKey,
                Authorization: `Bearer ${config.serviceRoleKey}`,
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates,return=minimal',
              },
              body: JSON.stringify([row]),
            });

            if (!rowResponse.ok) {
              const rowErrText = await rowResponse.text();
              failedRows += 1;
              console.error(`[${table}] Row failed ${done + i + 1}/${rows.length}: ${rowErrText}`);
            } else {
              okRows += 1;
            }
          } catch (rowError) {
            failedRows += 1;
            console.error(`[${table}] Row exception ${done + i + 1}/${rows.length}:`, rowError);
          }
        }

        done += chunk.length;
        console.log(`Seeding ${table}... ${done}/${rows.length} done`);
        continue;
      }

      okRows += chunk.length;
      done += chunk.length;
      console.log(`Seeding ${table}... ${done}/${rows.length} done`);
    } catch (error) {
      failedRows += chunk.length;
      done += chunk.length;
      console.error(`[${table}] Batch exception ${done - chunk.length + 1}-${done}:`, error);
    }
  }

  return { attempted: rows.length, success: okRows, failed: failedRows };
}

function mapOrganizations(rows) {
  return rows.map((row) => {
    const nameEn = toNull(row.name_en);
    return {
      id: row.id,
      parent_org_id: toNull(row.parent_org_id),
      org_type: row.org_type,
      code: toNull(row.code),
      name: row.name,
      country_code: toNull(row.country_code),
      currency_code: toNull(row.currency_code),
      status: row.status,
      metadata_json: nameEn ? { name_en: nameEn } : {},
    };
  });
}

function mapProducts(rows) {
  return rows.map((row) => {
    const nameEn = toNull(row.name_en);
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      brand: toNull(row.brand),
      category: toNull(row.category),
      volume_value: toNumber(row.volume_value),
      volume_unit: toNull(row.volume_unit),
      barcode: toNull(row.barcode),
      net_weight: toNumber(row.net_weight),
      gross_weight: toNumber(row.gross_weight),
      units_per_case: toInteger(row.units_per_case),
      case_length: toNumber(row.case_length),
      case_width: toNumber(row.case_width),
      case_height: toNumber(row.case_height),
      cbm: toNumber(row.cbm),
      hs_code: toNull(row.hs_code),
      status: row.status,
      extra_json: nameEn ? { name_en: nameEn } : {},
    };
  });
}

function mapOrders(rows) {
  return rows.map((row) => {
    const packingNo = toNull(row.packing_no_legacy);
    return {
      id: row.id,
      order_no: row.order_no,
      ordering_org_id: row.ordering_org_id,
      requested_by_user_id: null,
      vendor_org_id: toNull(row.vendor_org_id),
      sales_owner_user_id: ADMIN_USER_ID,
      logistics_owner_user_id: null,
      status: row.status,
      currency_code: row.currency_code,
      requested_delivery_date: toNull(row.requested_delivery_date),
      submitted_at: toNull(row.submitted_at),
      confirmed_at: toNull(row.confirmed_at),
      metadata_json: packingNo ? { packing_no_legacy: packingNo } : {},
    };
  });
}

function mapOrderItems(rows) {
  return rows.map((row) => {
    const productCode = toNull(row.product_code);
    const requestedQty = toInteger(row.requested_qty);
    const finalQty = toInteger(row.final_qty);
    return {
      id: row.id,
      order_id: row.order_id,
      line_no: toInteger(row.line_no),
      product_id: row.product_id,
      requested_qty: requestedQty === null ? null : Math.abs(requestedQty),
      vendor_confirmed_qty: null,
      sales_confirmed_qty: null,
      final_qty: finalQty === null ? null : Math.abs(finalQty),
      unit_price: toNumber(row.unit_price),
      status: row.status,
      metadata_json: productCode ? { product_code: productCode } : {},
    };
  });
}

function mapInventoryLots(rows, productIdBySku) {
  return rows.map((row) => {
    const productCode = toNull(row.product_code);
    const mappedProductId = productCode ? productIdBySku.get(productCode) : null;
    return {
      id: row.id,
      source_system: row.source_system,
      source_record_id: toNull(row.source_record_id),
      warehouse_code: row.warehouse_code,
      product_id: mappedProductId ?? row.product_id,
      lot_no: row.lot_no,
      on_hand_qty: toInteger(row.on_hand_qty),
      reserved_qty: toInteger(row.reserved_qty),
      available_qty: toInteger(row.available_qty),
      confidence_status: row.confidence_status,
      metadata_json: productCode ? { product_code: productCode } : {},
    };
  });
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function createAdminUser(config) {
  const authSql = `
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  role,
  aud,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '${ADMIN_USER_ID}',
  '00000000-0000-0000-0000-000000000000',
  'admin@evas.co.kr',
  crypt('admin1234!', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  ''
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  updated_at = now();`;

  const publicUserSql = `
INSERT INTO public.users (id, org_id, role, name, email, status)
VALUES (
  '${ADMIN_USER_ID}',
  '${EVAS_ORG_ID}',
  'admin',
  'System Admin',
  'admin@evas.co.kr',
  'active'
)
ON CONFLICT (id) DO UPDATE
SET
  org_id = EXCLUDED.org_id,
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  status = EXCLUDED.status;`;

  await runManagementSql(config, authSql, 'Create auth admin user');
  await runManagementSql(config, publicUserSql, 'Create public admin user');
  console.log('Admin user ready: 1/1 done');
}

async function updateProductImages(config, imageRows, chunkSize = 200) {
  const chunks = chunkArray(imageRows, chunkSize);
  let done = 0;
  let success = 0;
  let failed = 0;

  for (const chunk of chunks) {
    const valuesSql = chunk
      .map((row) => `(${sqlString(row.product_code)}, ${sqlString(row.image_url)})`)
      .join(',\n');

    const sql = `
UPDATE public.products p
SET image_url = v.image_url
FROM (VALUES
${valuesSql}
) AS v(sku, image_url)
WHERE p.sku = v.sku;`;

    try {
      await runManagementSql(config, sql, 'Update product images');
      done += chunk.length;
      success += chunk.length;
      console.log(`Updating product images... ${done}/${imageRows.length} done`);
    } catch (error) {
      done += chunk.length;
      failed += chunk.length;
      console.error(`[products:image_url] Batch failed ${done - chunk.length + 1}-${done}:`, error.message);
    }
  }

  return { attempted: imageRows.length, success, failed };
}

async function verifyCounts(config) {
  const countsSql = `
SELECT
  (SELECT COUNT(*) FROM public.organizations) AS organizations,
  (SELECT COUNT(*) FROM public.products) AS products,
  (SELECT COUNT(*) FROM public.orders) AS orders,
  (SELECT COUNT(*) FROM public.order_items) AS order_items,
  (SELECT COUNT(*) FROM public.inventory_lots) AS inventory_lots,
  (SELECT COUNT(*) FROM public.products WHERE image_url IS NOT NULL AND image_url <> '') AS products_with_image,
  (
    SELECT COUNT(*)
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE p.units_per_case IS NOT NULL
      AND oi.units_per_case IS NOT NULL
  ) AS order_items_units_per_case_backfilled,
  (
    SELECT COUNT(*)
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE p.units_per_case IS NOT NULL
  ) AS order_items_units_per_case_expected;`;

  const payload = await runManagementSql(config, countsSql, 'Verify row counts');
  const rows = parseManagementRows(payload);
  return rows[0] ?? null;
}

async function main() {
  const config = getConfig();
  const summary = {
    organizations: null,
    admin_user: 1,
    products: null,
    orders: null,
    order_items: null,
    inventory_lots: null,
    product_image_updates: null,
  };

  console.log('Loading CSV files...');
  const organizationsCsv = readCsv('01_organizations.csv');
  const productsCsv = readCsv('02_products_enriched.csv');
  const ordersCsv = readCsv('03_orders.csv');
  const orderItemsCsv = readCsv('04_order_items.csv');
  const inventoryCsv = readCsv('05_inventory.csv');
  const productImagesCsv = readCsv('06_product_images.csv');

  console.log('Seeding organizations...');
  const organizationsResult = await postgrestBulkInsert(config, 'organizations', mapOrganizations(organizationsCsv));
  summary.organizations = organizationsResult;

  console.log('Creating admin user...');
  try {
    await createAdminUser(config);
  } catch (error) {
    console.error('Admin user creation failed:', error.message);
  }

  console.log('Seeding products...');
  summary.products = await postgrestBulkInsert(config, 'products', mapProducts(productsCsv));
  const productIdBySku = new Map(productsCsv.map((row) => [row.sku, row.id]));

  console.log('Seeding orders...');
  summary.orders = await postgrestBulkInsert(config, 'orders', mapOrders(ordersCsv), 500);

  console.log('Seeding order_items...');
  summary.order_items = await postgrestBulkInsert(config, 'order_items', mapOrderItems(orderItemsCsv), 500);

  console.log('Seeding inventory_lots...');
  summary.inventory_lots = await postgrestBulkInsert(config, 'inventory_lots', mapInventoryLots(inventoryCsv, productIdBySku));

  console.log('Updating product image_url...');
  summary.product_image_updates = await updateProductImages(config, productImagesCsv);

  console.log('Backfilling order_items.units_per_case...');
  try {
    await runManagementSql(
      config,
      `
UPDATE public.order_items oi
SET units_per_case = p.units_per_case
FROM public.products p
WHERE oi.product_id = p.id
  AND p.units_per_case IS NOT NULL;`,
      'Backfill order_items.units_per_case',
    );
    console.log('Backfill complete');
  } catch (error) {
    console.error('Backfill failed:', error.message);
  }

  let verification = null;
  try {
    verification = await verifyCounts(config);
  } catch (error) {
    console.error('Verification query failed:', error.message);
  }

  console.log('\nSeed summary:');
  console.log(`- organizations: ${summary.organizations?.success ?? 0}/${summary.organizations?.attempted ?? 0} (failed: ${summary.organizations?.failed ?? 0})`);
  console.log(`- admin_user_created: ${summary.admin_user}`);
  console.log(`- products: ${summary.products?.success ?? 0}/${summary.products?.attempted ?? 0} (failed: ${summary.products?.failed ?? 0})`);
  console.log(`- orders: ${summary.orders?.success ?? 0}/${summary.orders?.attempted ?? 0} (failed: ${summary.orders?.failed ?? 0})`);
  console.log(`- order_items: ${summary.order_items?.success ?? 0}/${summary.order_items?.attempted ?? 0} (failed: ${summary.order_items?.failed ?? 0})`);
  console.log(`- inventory_lots: ${summary.inventory_lots?.success ?? 0}/${summary.inventory_lots?.attempted ?? 0} (failed: ${summary.inventory_lots?.failed ?? 0})`);
  console.log(`- product_image_updates: ${summary.product_image_updates?.success ?? 0}/${summary.product_image_updates?.attempted ?? 0} (failed: ${summary.product_image_updates?.failed ?? 0})`);

  if (verification) {
    console.log('\nVerification:');
    console.log(`- organizations: ${verification.organizations}`);
    console.log(`- products: ${verification.products}`);
    console.log(`- orders: ${verification.orders}`);
    console.log(`- order_items: ${verification.order_items}`);
    console.log(`- inventory_lots: ${verification.inventory_lots}`);
    console.log(`- products_with_image_url: ${verification.products_with_image}`);
    console.log(
      `- order_items units_per_case backfilled: ${verification.order_items_units_per_case_backfilled}/${verification.order_items_units_per_case_expected}`,
    );
  }
}

main().catch((error) => {
  console.error('Seed script failed:', error);
  process.exitCode = 1;
});
