export const EXPENSE_PAYMENT_TYPES = ['cash', 'online', 'owner_payout'];

export const isValidExpensePaymentType = (value) => EXPENSE_PAYMENT_TYPES.includes(value);

export const formatExpensePaymentType = (value) => {
	if (value === 'owner_payout') return 'Owner Payout';
	if (value === 'cash') return 'Cash';
	if (value === 'online') return 'Online';
	return value || '';
};
