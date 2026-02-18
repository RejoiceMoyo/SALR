"use client"

import React, { useRef } from 'react'
import { Button } from "@/components/ui/button"
import { FileUp, Download } from "lucide-react"
import { parseExcel, downloadTemplate } from "@/lib/excel-utils"
import { toast } from "sonner"

interface ImportExcelButtonProps {
  onImport: (data: any[]) => void;
  type: 'students' | 'teachers';
}

export function ImportExcelButton({ onImport, type }: ImportExcelButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseExcel(file);
      onImport(data);
      toast.success(`Successfully parsed ${data.length} records`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.error("Failed to parse Excel file");
      console.error(error);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        className="hidden"
        aria-label="Upload Excel file"
        title="Upload Excel file"
      />
      <Button 
        variant="outline" 
        size="sm" 
        type="button"
        onClick={() => downloadTemplate(type)}
        className="flex gap-2"
      >
        <Download className="h-4 w-4" />
        Template
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex gap-2"
      >
        <FileUp className="h-4 w-4" />
        Import Excel
      </Button>
    </div>
  );
}
