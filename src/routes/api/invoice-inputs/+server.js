import { json } from '@sveltejs/kit';
import db from '$lib/server/db.js';
import { sanitizeInvoiceInputs } from '$lib/invoice-inputs.js';

export const GET = () => json(db.prepare('SELECT * FROM invoice_inputs ORDER BY id DESC').all().map((/** @type {{id: number, created_at: string, inputs_json: string}} */ row) => ({
 id: row.id, createdAt: row.created_at, ...JSON.parse(row.inputs_json)
})));

export const POST = async ({ request }) => {
 let inputs;
 try {
  const body = await request.text();
  if (body.length > 32000) return json({ error: 'Inputs are too large.' }, { status: 413 });
  inputs = sanitizeInvoiceInputs(JSON.parse(body));
 } catch {
  return json({ error: 'Valid invoice inputs are required.' }, { status: 400 });
 }
 const serialized = JSON.stringify(inputs);
 db.prepare('INSERT OR IGNORE INTO invoice_inputs (inputs_json) VALUES (?)').run(serialized);
 const row = db.prepare('SELECT id FROM invoice_inputs WHERE inputs_json = ?').get(serialized);
 return json({ id: row.id }, { status: 201 });
};
