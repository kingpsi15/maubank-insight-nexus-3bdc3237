
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
      '15575025,Aarti Perni,+230 2878585,xyz@gmail.com,Core Banking,State Maubank issue resolved quickly,4,2024-01-15,Maubank,Mr. Gopal',
      '70165007,Vikash Pillai,+230 2467823,ab@gmail.com,Core Banking,I have my issue resolved,5,2024-01-16,Maubank,Ms. Dindoyal',
      '64935944,Siti Rahman,+230 4422456,siti@gmail.com,ATM,ATM service was excellent,5,2024-01-17,Maubank,Ms. Beeharry'
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
      console.log('File selected:', selectedFile.name, 'Size:', selectedFile.size);
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

  // Check if a row looks like headers or data
  const looksLikeHeaders = (values: string[]): boolean => {
    if (values.length < 4) return false;
    
    // Check if first value looks like a customer ID (numeric)
    const firstValue = values[0]?.trim();
    if (firstValue && /^\d+$/.test(firstValue)) {
      console.log('First value looks like customer ID:', firstValue);
      return false; // This looks like data, not headers
    }
    
    // Check if we have typical header words
    const headerWords = ['customer', 'name', 'phone', 'email', 'service', 'review', 'rating', 'text'];
    const hasHeaderWords = values.some(val => 
      headerWords.some(word => val.toLowerCase().includes(word))
    );
    
    console.log('Has header words:', hasHeaderWords, 'Values:', values.slice(0, 3));
    return hasHeaderWords;
  };

  const validateFeedbackData = (data: any, rowIndex: number): string | null => {
    console.log(`Validating row ${rowIndex} feedback data:`, data);
    
    // Customer name validation - check the actual property from the feedback object
    if (!data.customer_name || data.customer_name.trim() === '') {
      console.log(`Row ${rowIndex}: customer_name is missing or empty:`, data.customer_name);
      return 'Customer name is required and cannot be empty';
    }
    
    if (!data.service_type || !['ATM', 'OnlineBanking', 'CoreBanking'].includes(data.service_type)) {
      return 'Service type must be ATM, OnlineBanking, or CoreBanking';
    }
    
    if (!data.review_text || data.review_text.trim() === '') {
      return 'Review text is required';
    }
    
    const rating = data.review_rating;
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return 'Review rating must be a number between 1 and 5';
    }
    
    if (data.customer_email && data.customer_email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer_email)) {
      return 'Invalid email format';
    }
    
    return null;
  };

  const normalizeServiceType = (serviceType: string): 'ATM' | 'OnlineBanking' | 'CoreBanking' => {
    const normalized = serviceType.trim();
    console.log('Normalizing service type:', normalized);
    
    // Handle various forms of Online Banking
    if (normalized === 'Online Banking' || normalized === 'OnlineBanking' || normalized.toLowerCase() === 'online banking') {
      console.log('Mapped to OnlineBanking');
      return 'OnlineBanking';
    }
    
    // Handle various forms of Core Banking
    if (normalized === 'Core Banking' || normalized === 'CoreBanking' || normalized === 'Core Operations' || normalized.toLowerCase() === 'core banking') {
      console.log('Mapped to CoreBanking');
      return 'CoreBanking';
    }
    
    // Handle ATM
    if (normalized === 'ATM' || normalized.toLowerCase() === 'atm') {
      console.log('Mapped to ATM');
      return 'ATM';
    }
    
    console.log('Using default CoreBanking for:', normalized);
    return 'CoreBanking'; // default fallback
  };

  const processUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          console.log('File content loaded, length:', text.length);
          console.log('First 500 characters:', text.substring(0, 500));
          
          const lines = text.split(/\r?\n/).filter(line => line.trim());
          console.log('Total lines found:', lines.length);
          console.log('First 3 lines:', lines.slice(0, 3));
          
          if (lines.length < 1) {
            throw new Error('CSV file appears to be empty');
          }

          let hasHeaders = false;
          let dataStartIndex = 0;
          let headerMapping = new Map<string, string>();

          // Check if first row looks like headers
          const firstRowValues = parseCSVLine(lines[0]);
          hasHeaders = looksLikeHeaders(firstRowValues);
          
          console.log('Has headers:', hasHeaders);
          console.log('First row values:', firstRowValues);

          if (hasHeaders) {
            // Process headers normally
            const headers = firstRowValues.map(h => h.trim());
            console.log('Headers found:', headers);
            
            headers.forEach((header, index) => {
              const cleanHeader = header.toLowerCase().replace(/[^a-z]/g, '');
              console.log(`Header ${index}: "${header}" -> cleaned: "${cleanHeader}"`);
              
              if (cleanHeader.includes('customerid') || cleanHeader.includes('custid')) {
                headerMapping.set(index.toString(), 'CustomerId');
              } else if (cleanHeader.includes('customername') || cleanHeader.includes('custname') || cleanHeader.includes('name')) {
                headerMapping.set(index.toString(), 'CustomerName');
              } else if (cleanHeader.includes('customerphone') || cleanHeader.includes('phone')) {
                headerMapping.set(index.toString(), 'CustomerPhone');
              } else if (cleanHeader.includes('customeremail') || cleanHeader.includes('email')) {
                headerMapping.set(index.toString(), 'CustomerEmail');
              } else if (cleanHeader.includes('servicetype') || cleanHeader.includes('service')) {
                headerMapping.set(index.toString(), 'ServiceType');
              } else if (cleanHeader.includes('reviewtext') || cleanHeader.includes('review') && cleanHeader.includes('text')) {
                headerMapping.set(index.toString(), 'ReviewText');
              } else if (cleanHeader.includes('reviewrating') || cleanHeader.includes('rating')) {
                headerMapping.set(index.toString(), 'ReviewRating');
              } else if (cleanHeader.includes('date')) {
                headerMapping.set(index.toString(), 'Date');
              } else if (cleanHeader.includes('issuelocation') || cleanHeader.includes('location')) {
                headerMapping.set(index.toString(), 'IssueLocation');
              } else if (cleanHeader.includes('contactedbankperson') || cleanHeader.includes('bankperson') || cleanHeader.includes('contacted')) {
                headerMapping.set(index.toString(), 'ContactedBankPerson');
              }
            });
            dataStartIndex = 1;
          } else {
            // No headers - use default column mapping based on your Excel file structure
            console.log('No headers detected, using default mapping');
            headerMapping = new Map([
              ['0', 'CustomerId'],      // Customer ID
              ['1', 'CustomerName'],    // Customer Name  
              ['2', 'CustomerPhone'],   // Customer Phone
              ['3', 'CustomerEmail'],   // Customer Email
              ['4', 'ServiceType'],     // Service Type
              ['5', 'ReviewText'],      // Review Text
              ['6', 'ReviewRating'],    // Review Rating
              ['7', 'Date'],            // Date
              ['8', 'IssueLocation'],   // Issue Location
              ['9', 'ContactedBankPerson'] // Contacted Bank Person
            ]);
            dataStartIndex = 0;
          }

          console.log('Header mapping:', Array.from(headerMapping.entries()));

          // Check for required headers
          const requiredFields = ['CustomerName', 'ServiceType', 'ReviewText', 'ReviewRating'];
          const mappedValues = Array.from(headerMapping.values());
          const missingHeaders = requiredFields.filter(field => !mappedValues.includes(field));
          
          if (missingHeaders.length > 0) {
            throw new Error(`Missing required columns: ${missingHeaders.join(', ')}. Please ensure your CSV has the correct column order: Customer ID, Customer Name, Customer Phone, Customer Email, Service Type, Review Text, Review Rating, Date, Issue Location, Contacted Bank Person`);
          }

          const dataRows = lines.slice(dataStartIndex);
          const feedbackData: any[] = [];
          const errors: Array<{ row: number; error: string }> = [];

          console.log('Processing', dataRows.length, 'data rows');

          // Process each row
          for (let i = 0; i < dataRows.length; i++) {
            const rowIndex = i + dataStartIndex + 1; // Adjust for header and 1-based indexing
            const progress = Math.round((i / dataRows.length) * 80); // 80% for processing
            setProgress(progress);

            try {
              const values = parseCSVLine(dataRows[i]);
              console.log(`Row ${rowIndex} raw values (${values.length}):`, values);
              
              if (values.length === 0 || values.every(v => !v || v.trim() === '')) {
                console.log(`Row ${rowIndex}: Skipping empty row`);
                continue;
              }

              const rowData: any = {};
              Array.from(headerMapping.entries()).forEach(([index, mappedHeader]) => {
                const value = values[parseInt(index)] || '';
                rowData[mappedHeader] = value;
                console.log(`Row ${rowIndex}: ${mappedHeader} = "${value}"`);
              });

              console.log(`Row ${rowIndex} mapped data:`, rowData);

              // Convert to our format - ensure we're using the right property names
              const feedbackItem = {
                customer_id: rowData.CustomerId || null,
                customer_name: rowData.CustomerName || '',
                customer_phone: rowData.CustomerPhone || null,
                customer_email: rowData.CustomerEmail || null,
                service_type: normalizeServiceType(rowData.ServiceType || ''),
                review_text: rowData.ReviewText || '',
                review_rating: parseInt(rowData.ReviewRating) || 1,
                issue_location: rowData.IssueLocation || null,
                contacted_bank_person: rowData.ContactedBankPerson || null,
                status: 'new' as const,
                sentiment: 'neutral' as const,
                detected_issues: []
              };

              console.log(`Row ${rowIndex} feedback item before validation:`, feedbackItem);

              // Validate the data - pass the feedback item directly
              const validationError = validateFeedbackData(feedbackItem, rowIndex);
              if (validationError) {
                console.log(`Row ${rowIndex} validation failed:`, validationError);
                errors.push({ row: rowIndex, error: validationError });
                continue;
              }

              feedbackData.push(feedbackItem);
            } catch (error) {
              console.error(`Error processing row ${rowIndex}:`, error);
              errors.push({ row: rowIndex, error: `Failed to parse row: ${error}` });
            }
          }

          setProgress(85);

          console.log('Valid feedback data count:', feedbackData.length);
          console.log('Errors count:', errors.length);

          // Bulk insert valid data
          let successfulInserts = 0;
          if (feedbackData.length > 0) {
            try {
              const inserted = await feedbackService.bulkCreate(feedbackData);
              successfulInserts = inserted.length;
              console.log('Successfully inserted:', successfulInserts);
            } catch (error) {
              console.error('Bulk insert error:', error);
              errors.push({ row: 0, error: `Database error: ${error}` });
            }
          }

          setProgress(100);
          setUploading(false);

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

          if (result.successful > 0) {
            onUploadComplete();
          }

        } catch (error) {
          console.error('Upload processing error:', error);
          toast({
            title: "Upload Failed",
            description: error instanceof Error ? error.message : "An error occurred while processing the file.",
            variant: "destructive"
          });
          setUploading(false);
        }
      };

      fileReader.onerror = (error) => {
        console.error('File reading error:', error);
        toast({
          title: "File Reading Failed",
          description: "Could not read the selected file. Please try again.",
          variant: "destructive"
        });
        setUploading(false);
      };

      // Read the file
      fileReader.readAsText(file);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred while processing the file.",
        variant: "destructive"
      });
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
            <p className="font-semibold mb-2">Expected column order (with or without headers):</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Customer ID - Unique customer identifier (optional)</li>
              <li>Customer Name - Full name of the customer (required)</li>
              <li>Customer Phone - Phone number with country code (optional)</li>
              <li>Customer Email - Valid email address (optional)</li>
              <li>Service Type - ATM, OnlineBanking, CoreBanking, Core Banking, Core Operations, or Online Banking (required)</li>
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
            Select a CSV file containing customer feedback data. The system will automatically detect if column headers are present or use default column mapping.
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
