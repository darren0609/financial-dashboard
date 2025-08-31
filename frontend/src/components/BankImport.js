import React, { useRef, useState } from 'react';
import Papa from 'papaparse';

function BankImport({ onImport }) {
  const fileInput = useRef(null);
  const [importFormat, setImportFormat] = useState('template');
  const [importType, setImportType] = useState('transactions');

  const normalizeAccountType = (type) => {
    const typeMap = {
      'Cash': 'cash',
      'Cash Management': 'cash',
      'Transaction': 'checking',
      'Everyday': 'checking',
      'Savings Account': 'savings',
      'Term Deposit Account': 'term deposit',
      'Credit Card': 'credit',
      'Loan': 'loan',
      'Mortgage': 'mortgage',
      'Super': 'super',
      'Investment': 'investment',
      'Investments': 'investment',
      'Investment Account': 'investment',
      'Share Trading': 'investment',
      'Share Account': 'investment',
      'Superannuation': 'super',
      'Term Deposit': 'term deposit',
      'Savings': 'savings',
      'Transaction Account': 'checking',
      'Current Account': 'checking'
    };
    
    // First try exact match
    if (typeMap[type]) {
      return typeMap[type];
    }
    
    // Try case-insensitive match
    const normalizedInput = type.trim();
    for (const [key, value] of Object.entries(typeMap)) {
      if (key.toLowerCase() === normalizedInput.toLowerCase()) {
        return value;
      }
    }
    
    // Default fallback
    console.log(`Account type "${type}" not found in mapping, defaulting to checking`);
    return 'checking';
  };

  const downloadTemplate = () => {
    const template = importType === 'accounts' 
      ? `Account Type,Account Nickname/Name,BSB,Account Number/Portfolio Number,Closing Balance,As at date for closing balance,Market Value,Opening date,Closing date,Export Date and time`
      : `Bank Account,Date,Narrative,Debit Amount,Credit Amount,Balance,Categories,Serial`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}_template.csv`;
    a.click();
  };

  const processAccountNumber = (fullNumber) => {
    if (!fullNumber) return { bsb: '', accountNumber: '' };
    const cleaned = fullNumber.replace(/\D/g, '');
    return {
      bsb: cleaned.substring(0, 6),
      accountNumber: cleaned.substring(6)
    };
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      // Try different date formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      // Try DD/MM/YYYY format
      const [day, month, year] = dateStr.split('/');
      if (day && month && year) {
        const newDate = new Date(year, month - 1, day);
        if (!isNaN(newDate.getTime())) {
          return newDate.toISOString();
        }
      }
      return null;
    };

    Papa.parse(file, {
      complete: (results) => {
        let data;

        if (importType === 'accounts') {
          // Handle account import
          data = results.data
            .filter(row => row['Account Type'] && row['Account Nickname/Name'])
            .map(row => {
              const { bsb, accountNumber } = processAccountNumber(row['Account Number/Portfolio Number']);
              const originalType = row['Account Type'];
              const normalizedType = normalizeAccountType(originalType);
              console.log(`Account type mapping: "${originalType}" -> "${normalizedType}"`);
              
              console.log('Processing dates:', {
                opening: row['Opening date'],
                closing: row['Closing date'],
                asAt: row['As at date for closing balance'],
                export: row['Export Date and time']
              });
              return {
                type: normalizedType,
                name: row['Account Nickname/Name'],
                bsb: row['BSB'] || bsb,
                accountNumber: accountNumber,
                balance: parseFloat(row['Closing Balance']?.replace(/[^0-9.-]+/g, '') || 0),
                marketValue: parseFloat(row['Market Value']?.replace(/[^0-9.-]+/g, '') || 0),
                openingDate: parseDate(row['Opening date']),
                closingDate: parseDate(row['Closing date']),
                lastUpdated: parseDate(row['As at date for closing balance']) || parseDate(row['Export Date and time'])
              };
            });
        } else {
          // Handle transaction import
          data = results.data
            .filter(row => row['Bank Account'] && (row['Debit Amount'] || row['Credit Amount']))
            .map(row => {
              const debitAmount = parseFloat(row['Debit Amount'] || '0');
              const creditAmount = parseFloat(row['Credit Amount'] || '0');
              const amount = creditAmount - debitAmount;
              const { bsb, accountNumber } = processAccountNumber(row['Bank Account'].split(' ').pop());
              
              return {
                date: row['Date'],
                description: row['Narrative'],
                amount: amount,
                type: amount >= 0 ? 'income' : 'expense',
                category: row['Categories'] || 'Uncategorized',
                accountIdentifier: {
                  bsb,
                  accountNumber
                },
                balance: parseFloat(row['Balance'].replace(/[^0-9.-]+/g, '')),
                serial: row['Serial']
              };
            });
        }

        // Filter out any invalid entries
        data = data.filter(item => {
          if (importType === 'accounts') {
            return item.name && (item.bsb || item.accountNumber);
          }
          return !isNaN(item.amount) && item.date;
        });

        console.log(`Processed ${importType}:`, data);
        onImport(data, importType);
      },
      header: true,
      skipEmptyLines: true
    });
  };

  return (
    <div>
      <div className="mb-3">
        <div className="form-check form-check-inline">
          <input
            className="form-check-input"
            type="radio"
            name="importType"
            id="transactionsImport"
            value="transactions"
            checked={importType === 'transactions'}
            onChange={(e) => setImportType(e.target.value)}
          />
          <label className="form-check-label" htmlFor="transactionsImport">
            Import Transactions
          </label>
        </div>
        <div className="form-check form-check-inline">
          <input
            className="form-check-input"
            type="radio"
            name="importType"
            id="accountsImport"
            value="accounts"
            checked={importType === 'accounts'}
            onChange={(e) => setImportType(e.target.value)}
          />
          <label className="form-check-label" htmlFor="accountsImport">
            Import Accounts
          </label>
        </div>
      </div>

      <div className="mb-3">
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={downloadTemplate}
        >
          Download Template
        </button>
      </div>

      <div className="mb-3">
        <label className="form-label">Import {importType === 'accounts' ? 'Accounts' : 'Transactions'} (CSV)</label>
        <input
          type="file"
          className="form-control"
          accept=".csv"
          onChange={handleFileUpload}
          ref={fileInput}
        />
        <small className="text-muted">
          {importType === 'accounts' 
            ? 'Expected columns: Account Type, Account Nickname/Name, BSB, Account Number/Portfolio Number, etc.'
            : 'Expected columns: Bank Account, Date, Narrative, Debit Amount, Credit Amount, etc.'
          }
        </small>
      </div>
    </div>
  );
}

export default BankImport; 