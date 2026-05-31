export type DepositBankAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  note: string;
};

export type DepositBankConfig = {
  banks: DepositBankAccount[];
};

export function createEmptyBankAccount(): DepositBankAccount {
  return {
    id: crypto.randomUUID(),
    bankName: "",
    accountNumber: "",
    accountName: "",
    note: "",
  };
}

export function isValidBankAccount(bank: DepositBankAccount) {
  return Boolean(
    bank.bankName.trim() && bank.accountNumber.trim() && bank.accountName.trim()
  );
}

export function getValidBanks(banks: DepositBankAccount[]) {
  return banks.filter(isValidBankAccount);
}

export function hasDepositBankDetails(banks: DepositBankAccount[]) {
  return getValidBanks(banks).length > 0;
}
