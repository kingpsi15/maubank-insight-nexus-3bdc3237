
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { feedbackService } from '@/services';

interface BulkUploadProps {
  onUploadComplete: () => void;
}

interface UploadResult {
  totalRows: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

const BulkUpload = ({ onUploadComplete }: BulkUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    // Create CSV template with all mandatory fields
    const headers = [
      'CustomerId',
      'CustomerName',
      'CustomerPhone', 
      'CustomerEmail',
      'ServiceType',
      'ReviewText',
      'ReviewRating',
      'Date',
      'IssueLocation',
      'ContactedBankPerson'
    ];
    
    const sampleData = [
      'CUST001,John Doe,+60-12-3456789,john@email.com,ATM,Great service and fast transaction,5,2024-01-15,Kuala Lumpur,Rajesh Kumar',
      'CUST002,Jane Smith,+60-12-3456790,jane@email.com,OnlineBanking,Login issues and slow loading,2,2024-01-16,Selangor,Priya Sharma',
      'CUST003,Ahmad bin Ali,+60-13-7890123,ahmad@email.com,CoreBanking,Account balance showing wrong amount,1,2024-01-17,Penang,Ahmad Rahman'
    ];
    
    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file.",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const validateFeedbackData = (data: any, rowIndex: number): string | null => {
    if (!data.customerName || data.customerName.trim() === '') {
      return 'Customer name is required';
    }
    
    if (!data.serviceType || !['ATM', 'OnlineBanking', 'CoreBanking'].includes(data.serviceType)) {
      return 'Service type must be ATM, OnlineBanking, or CoreBanking';
    }
    
    if (!data.reviewText || data.reviewText.trim() === '') {
      return 'Review text is required';
    }
    
    const rating = parseInt(data.reviewRating);
    if (isNaN(rating) || rating < 0 || rating > 5) {
      return 'Review rating must be a number between 0 and 5';
    }
    
    if (data.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
      return 'Invalid email format';
    }
    
    return null;
  };

  const processUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must contain headers and at least one data row');
      }

      const headers = parseCSVLine(lines[0]).map(h => h.trim());
      const expectedHeaders = ['CustomerId', 'CustomerName', 'CustomerPhone', 'CustomerEmail', 'ServiceType', 'ReviewText', 'ReviewRating', 'Date', 'IssueLocation', 'ContactedBankPerson'];
      
      // Validate headers
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
      }

      const dataRows = lines.slice(1);
      const feedbackData: any[] = [];
      const errors: Array<{ row: number; error: string }> = [];

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const rowIndex = i + 2; // +2 because we skip header and arrays are 0-indexed
        const progress = Math.round((i / dataRows.length) * 80); // 80% for processing
        setProgress(progress);

        try {
          const values = parseCSVLine(dataRows[i]);
          
          if (values.length !== headers.length) {
            errors.push({ row: rowIndex, error: `Expected ${headers.length} columns, got ${values.length}` });
            continue;
          }

          const rowData: any = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });

          // Convert to our format
          const feedbackItem = {
            customer_id: rowData.CustomerId || null,
            customer_name: rowData.CustomerName,
            customer_phone: rowData.CustomerPhone || null,
            customer_email: rowData.CustomerEmail || null,
            service_type: rowData.ServiceType as 'ATM' | 'OnlineBanking' | 'CoreBanking',
            review_text: rowData.ReviewText,
            review_rating: parseInt(rowData.ReviewRating) || 0,
            issue_location: rowData.IssueLocation || null,
            contacted_bank_person: rowData.ContactedBankPerson || null,
            status: 'new' as const,
            sentiment: 'neutral' as const,
            detected_issues: []
          };

          // Validate the data
          const validationError = validateFeedbackData(feedbackItem, rowIndex);
          if (validationError) {
            errors.push({ row: rowIndex, error: validationError });
            continue;
          }

          feedbackData.push(feedbackItem);
        } catch (error) {
          errors.push({ row: rowIndex, error: `Failed to parse row: ${error}` });
        }
      }

      setProgress(85);

      // Bulk insert valid data
      let successfulInserts = 0;
      if (feedbackData.length > 0) {
        try {
          const inserted = await feedbackService.bulkCreate(feedbackData);
          successfulInserts = inserted.length;
        } catch (error) {
          console.error('Bulk insert error:', error);
          errors.push({ row: 0, error: `Database error: ${error}` });
        }
      }

      setProgress(100);

      const result: UploadResult = {
        totalRows: dataRows.length,
        successful: successfulInserts,
        failed: errors.length,
        errors: errors.slice(0, 10) // Show only first 10 errors
      };

      setUploadResult(result);
      
      toast({
        title: "Upload Complete",
        description: `Successfully processed ${result.successful} out of ${result.totalRows} records.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred while processing the file.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Download Template
          </CardTitle>
          <CardDescription>
            Download the CSV template with the correct format and sample data. All columns are mandatory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p className="font-semibold mb-2">Required columns:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>CustomerId - Unique customer identifier</li>
              <li>CustomerName - Full name of the customer</li>
              <li>CustomerPhone - Phone number with country code</li>
              <li>CustomerEmail - Valid email address</li>
              <li>ServiceType - ATM, OnlineBanking, or CoreBanking</li>
              <li>ReviewText - Customer feedback text</li>
              <li>ReviewRating - Rating from 0 to 5 (0 means no rating)</li>
              <li>Date - Feedback date (YYYY-MM-DD format)</li>
              <li>IssueLocation - Location where issue occurred</li>
              <li>ContactedBankPerson - Name of bank employee contacted</li>
            </ul>
          </div>
          <Button onClick={downloadTemplate} variant="outline" className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Upload Feedback Data
          </CardTitle>
          <CardDescription>
            Select a CSV file containing customer feedback data with all mandatory columns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Select CSV File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              ref={fileInputRef}
              className="mt-1"
            />
          </div>

          {file && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span>{file.name} ({Math.round(file.size / 1024)} KB)</span>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={processUpload}
              disabled={!file || uploading}
              className="flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Processing...' : 'Upload & Process'}
            </Button>
            
            {file && (
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setUploadResult(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Results */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{uploadResult.totalRows}</div>
                <div className="text-sm text-gray-600">Total Rows</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{uploadResult.successful}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{uploadResult.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>

            {uploadResult.errors.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                  Errors ({uploadResult.errors.length}{uploadResult.errors.length >= 10 ? '+' : ''})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {uploadResult.errors.map((error, index) => (
                    <div key={index} className="text-sm bg-red-50 p-2 rounded border-l-4 border-l-red-400">
                      <strong>Row {error.row}:</strong> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={onUploadComplete} className="w-full">
              Continue to Feedback Management
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkUpload;
