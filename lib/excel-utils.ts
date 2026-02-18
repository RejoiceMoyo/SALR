import * as XLSX from 'xlsx';

export async function parseExcel(file: File): Promise<any[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  // Convert to JSON - this captures every column in the Excel file automatically
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  return jsonData;
}

export function downloadTemplate(type: 'students' | 'teachers') {
  const headers = type === 'students' 
    ? [['first_name', 'last_name', 'email', 'gender', 'date_of_birth', 'grade', 'section']]
    : [['first_name', 'last_name', 'email', 'phone', 'subject', 'qualification']];
  
  const ws = XLSX.utils.aoa_to_sheet(headers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, `${type}_template.xlsx`);
}