export type DepositBankDetails = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  note: string;
};

export const emptyDepositBankDetails: DepositBankDetails = {
  bankName: "",
  accountNumber: "",
  accountName: "",
  note: "",
};

export function hasDepositBankDetails(details: DepositBankDetails) {
  return Boolean(details.bankName && details.accountNumber && details.accountName);
}
