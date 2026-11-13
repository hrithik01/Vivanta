// Keep saved history limited to editable inputs. Never persist rendered HTML or PDFs.
const invoiceFields = `billNo billDate customerName companyName customerGstin customerPhone placeOfSupply sac arrivalDate arrivalTime departureDate departureTime roomNo persons particulars roomType unit rate cgstRate sgstRate cgstOverride sgstOverride totalOverride amountPaid paymentMode paymentReference`.split(' ');
const profileFields = `logoLetter name phones address gstin signatoryFor jurisdiction state`.split(' ');
/** @param {Record<string, unknown>} source @param {string[]} fields */
const pickInputs = (source, fields) => Object.fromEntries(fields.map((key) => {
 const value = source?.[key];
 if (value != null && typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Invalid input.');
 if (String(value ?? '').length > 2000) throw new Error('Input is too long.');
 return [key, value ?? ''];
}));

/** @param {{invoice?: Record<string, unknown>, profile?: Record<string, unknown>}} input */
export const sanitizeInvoiceInputs = (input) => {
 const invoice = pickInputs(input?.invoice || {}, invoiceFields);
 const profile = pickInputs(input?.profile || {}, profileFields);
 if (!String(invoice.billNo).trim() || !String(invoice.customerName).trim()) throw new Error('Invoice number and customer name are required.');
 return { invoice, profile };
};
