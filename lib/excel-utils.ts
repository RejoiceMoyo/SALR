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
  let headers: string[][] = [];
  
  if (type === 'students') {
    headers = [[
      'Student number',
      'Surname',
      'Name',
      'Class',
      'Gender',
      'Status',
      'Allergies',
      'Medical Notes',
      'Date of Birth',
      'Mom no',
      'Dad no',
      'Guardian number',
      'Emergency contact',
      'Driver name',
      'Driver contact',
      'Address'
    ]];
  } else {
    headers = [['first_name', 'last_name', 'email', 'phone', 'subject', 'qualification']];
  }
  
  const ws = XLSX.utils.aoa_to_sheet(headers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, `${type}_template.xlsx`);
}