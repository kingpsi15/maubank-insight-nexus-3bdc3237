
import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';

const CSVTemplate = () => {
  const generateTemplate = () => {
    const headers = [
      'Review Rating',
      'Customer ID', 
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Service Type',
      'Review Text',
      'Date',
      'Issue Location',
      'Contacted Bank Person'
    ];
    
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'feedback_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Button 
      onClick={generateTemplate} 
      variant="outline" 
      className="mb-4"
    >
      <Download className="w-4 h-4 mr-2" />
      Download CSV Template
    </Button>
  );
};

export default CSVTemplate;
