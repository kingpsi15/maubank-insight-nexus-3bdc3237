
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
    // Create CSV template matching the actual format from the Excel file
    const headers = [
      'Customer ID',
      'Customer Name', 
      'Customer Phone',
      'Customer Email',
      'Service Type',
      'Review Text',
      'Review Rating',
      'Date',
      'Issue Location',
      'Contacted Bank Person'
    ];
    
    const sampleData = [
      '15575025,Aarti Perni,+230 2878,xyz@gmail.com,Core Banking,State Maubank issue,4,########,Maubank,Mr. Gopal',
      '70165007,Vikash Pillai,+230 2467,ab@gmail.com,Core Banking,I have my issue,5,########,Maubank,Ms. Dindoyal',
      '64935944,Aarti Perni,+230 4422,xyz@gmail.com,ATM,I am using ATM,5,########,Maubank,Ms. Beeharry'
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
    
    if (!data.serviceType || !['ATM', 'OnlineBanking', 'CoreBanking', 'Core Banking', 'Online Banking'].includes(data.serviceType)) {
      return 'Service type must be ATM, OnlineBanking, CoreBanking, Core Banking, or Online Banking';
    }
    
    if (!data.reviewText || data.reviewText.trim() === '') {
      return 'Review text is required';
    }
    
    const rating = parseInt(data.reviewRating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return 'Review rating must be a number between 1 and 5';
    }
    
    if (data.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
      return 'Invalid email format';
    }
    
    return null;
  };

  const normalizeServiceType = (serviceType: string): 'ATM' | 'OnlineBanking' | 'CoreBanking' => {
    const normalized = serviceType.trim();
    if (normalized === 'Core Banking') return 'CoreBanking';
    if (normalized === 'Online Banking') return 'OnlineBanking';
    if (normalized === 'ATM') return 'ATM';
    if (normalized === 'CoreBanking') return 'CoreBanking';
    if (normalized === 'OnlineBanking') return 'OnlineBanking';
    return 'CoreBanking'; // default fallback
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
      console.log('Headers found:', headers);
      
      // Map headers to expected format (handle both formats)
      const headerMapping: { [key: string]: string } = {
        'Customer ID': 'CustomerId',
        'CustomerId': 'CustomerId',
        'Customer Name': 'CustomerName',
        'CustomerName': 'CustomerName',
        'Customer Phone': 'CustomerPhone',
        'CustomerPhone': 'CustomerPhone',
        'Customer Email': 'CustomerEmail',
        'CustomerEmail': 'CustomerEmail',
        'Service Type': 'ServiceType',
        'ServiceType': 'ServiceType',
        'Review Text': 'ReviewText',
        'ReviewText': 'ReviewText',
        'Review Rating': 'ReviewRating',
        'ReviewRating': 'ReviewRating',
        'Date': 'Date',
        'Issue Location': 'IssueLocation',
        'IssueLocation': 'IssueLocation',
        'Contacted Bank Person': 'ContactedBankPerson',
        'ContactedBankPerson': 'ContactedBankPerson'
      };

      const normalizedHeaders = headers.map(h => headerMapping[h] || h);
      const requiredHeaders = ['CustomerName', 'ServiceType', 'ReviewText', 'ReviewRating'];
      
      // Check for required headers
      const missingHeaders = requiredHeaders.filter(h => !normalizedHeaders.includes(h));
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
            const normalizedHeader = headerMapping[header] || header;
            rowData[normalizedHeader] = values[index] || '';
          });

          // Convert to our format
          const feedbackItem = {
            customer_id: rowData.CustomerId || null,
            customer_name: rowData.CustomerName,
            customer_phone: rowData.CustomerPhone || null,
            customer_email: rowData.CustomerEmail || null,
            service_type: normalizeServiceType(rowData.ServiceType),
            review_text: rowData.ReviewText,
            review_rating: parseInt(rowData.ReviewRating) || 1,
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
            Download the CSV template with the correct format and sample data. Customer Name, Service Type, Review Text, and Review Rating (1-5) are mandatory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p className="font-semibold mb-2">Required columns:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Customer ID - Unique customer identifier (optional)</li>
              <li>Customer Name - Full name of the customer (required)</li>
              <li>Customer Phone - Phone number with country code (optional)</li>
              <li>Customer Email - Valid email address (optional)</li>
              <li>Service Type - ATM, OnlineBanking, CoreBanking, Core Banking, or Online Banking (required)</li>
              <li>Review Text - Customer feedback text (required)</li>
              <li>Review Rating - Rating from 1 to 5 (required)</li>
              <li>Date - Feedback date (YYYY-MM-DD format) (optional)</li>
              <li>Issue Location - Location where issue occurred (optional)</li>
              <li>Contacted Bank Person - Name of bank employee contacted (optional)</li>
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
            Select a CSV file containing customer feedback data. The system accepts both formats: "Customer Name" and "CustomerName".
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
