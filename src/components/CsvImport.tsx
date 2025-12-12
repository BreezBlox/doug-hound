import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { FinancialEntry } from "@/types";
import { parseLocalDateString } from "@/utils/dateUtils";
import { v4 as uuidv4 } from "uuid";

interface CsvImportProps {
  onImport: (entries: FinancialEntry[]) => void;
}

const CsvImport: React.FC<CsvImportProps> = ({ onImport }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMessage(null);
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const entries: FinancialEntry[] = [];
        for (const row of results.data as any[]) {
          // Required fields validation
          if (!row.type || !row.name || !row.amount || !row.date || !row.frequency) continue;

          // Validate and parse type
          const typeLower = row.type.toLowerCase().trim();
          if (typeLower !== "bill" && typeLower !== "paycheck" && typeLower !== "purchase") continue;

          // Parse amount
          const amount = parseFloat(row.amount);
          if (isNaN(amount)) continue;

          // Parse required date
          const date = parseLocalDateString(row.date);

          // Parse optional fields
          let occurrenceLimit: number | undefined = undefined;
          if (row.occurrence) {
            const parsedLimit = parseInt(row.occurrence, 10);
            if (!isNaN(parsedLimit) && parsedLimit > 0) occurrenceLimit = parsedLimit;
          }

          let stopDate: Date | undefined = undefined;
          if (row.stopDate && row.stopDate.trim() !== '') {
            stopDate = parseLocalDateString(row.stopDate);
            // invalidate if invalid date
            if (isNaN(stopDate.getTime())) stopDate = undefined;
          }

          let customDates: string[] | undefined = undefined;
          if (row.customDates && row.customDates.trim() !== '') {
            // Assume space or comma separated
            customDates = row.customDates.split(/[ ,]+/).map((d: string) => {
              // Try to normalize to keep simple text or validate? 
              // For now just keep the raw strings, assuming user follows format.
              // Ideally validation could happen here.
              return d.trim();
            }).filter((d: string) => d.length > 0);
          }

          entries.push({
            id: uuidv4(),
            type: typeLower as any,
            name: row.name,
            amount,
            date,
            frequency: row.frequency,
            occurrenceLimit,
            stopDate,
            customDates
          });
        }
        console.log("CSV parsed entries:", entries);
        if (entries.length > 0) {
          setMessage(`Imported ${entries.length} entries successfully!`);
          setError(null);
          onImport(entries);
        } else {
          setMessage(null);
          setError("No valid entries found in the CSV file.");
        }
        if (inputRef.current) inputRef.current.value = "";
      },
      error: (err) => {
        setMessage(null);
        setError("CSV parse error: " + err.message);
      }
    });
  }

  return (
    <div className="mb-4 flex flex-col items-center">
      <label className="font-orbitron text-mgs-green mb-2">Import Bills & Paychecks via CSV</label>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="block w-full text-xs text-mgs-green file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-xs file:font-orbitron file:bg-mgs-green file:text-mgs-black hover:file:bg-mgs-darkgreen"
        onChange={handleFileChange}
      />
      <a
        href={`data:text/csv;charset=utf-8,` + encodeURIComponent(
          [
            'type,name,amount,date,frequency,occurrence,stopDate,customDates',
            'bill,Rent,1500,01/01/2025,monthly,,01/01/2026,',
            'paycheck,Work Salary,3000,15/01/2025,bi-weekly,,,,',
            'purchase,Laptop,1000,10/01/2025,one-time,,,,',
            'bill,Car Loan,300,05/01/2025,monthly,24,,',
            'purchase,Gym Membership,50,01/01/2025,one-time,,,01/01/2025 01/04/2025 01/07/2025' // Custom dates example
          ].join('\n')
        )}
        download="doughflow-template.csv"
        className="mt-2 text-xs underline text-mgs-lightgray hover:text-mgs-green"
      >
        Download CSV Template
      </a>
      {message && <div className="mt-2 text-xs text-mgs-green">{message}</div>}
      {error && <div className="mt-2 text-xs text-mgs-red">{error}</div>}
    </div>
  );
};

export default CsvImport;
