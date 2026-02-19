import Papa from 'papaparse';

const REQUIRED_COLUMNS = [
  'transaction_id',
  'sender_id',
  'receiver_id',
  'amount',
  'timestamp'
];

export const parseCSV = (csvData) => {
  const result = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parsing error: ${result.errors[0].message}`);
  }

  // Validate schema
  const headers = Object.keys(result.data[0] || {});
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Validate and transform data
  const transactions = result.data.map((row, index) => {
    if (!row.transaction_id || !row.sender_id || !row.receiver_id) {
      throw new Error(`Invalid data at row ${index + 2}: missing required fields`);
    }

    return {
      transaction_id: String(row.transaction_id),
      sender_id: String(row.sender_id),
      receiver_id: String(row.receiver_id),
      amount: parseFloat(row.amount),
      timestamp: row.timestamp
    };
  });

  return transactions;
};
