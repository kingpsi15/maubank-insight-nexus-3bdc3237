import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useFeedback } from '@/hooks/useFeedback';
import type { Feedback } from '@/services/types';

interface CSVRow {
  [key: string]: string;
}

const BulkUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState<{
    total: number;
    processed: number;
    errors: number;
  } | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { createFeedback } = useFeedback();

  // Improved column mapping with more flexible matching
  const getColumnMapping = (headers: string[]) => {
    const mapping: { [key: string]: string } = {};
    
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      console.log('Processing header:', header, 'normalized:', normalizedHeader);
      
      // Customer Name - more flexible
      if (normalizedHeader.includes('customername') || 
          normalizedHeader.includes('custname') ||
          normalizedHeader === 'name' ||
          normalizedHeader === 'customer') {
        mapping[header] = 'customer_name';
      }
      // Customer ID
      else if (normalizedHeader.includes('customerid') || 
               normalizedHeader.includes('custid') ||
               normalizedHeader === 'id') {
        mapping[header] = 'customer_id';
      }
      // Phone - handle variations
      else if (normalizedHeader.includes('phone') || 
               normalizedHeader.includes('mobile') || 
               normalizedHeader.includes('contact') ||
               normalizedHeader.includes('tel')) {
        mapping[header] = 'customer_phone';
      }
      // Email
      else if (normalizedHeader.includes('email') || normalizedHeader.includes('mail')) {
        mapping[header] = 'customer_email';
      }
      // Service Type - handle truncated headers like "Service Ty"
      else if (normalizedHeader.includes('service') || 
               normalizedHeader.includes('servicety') ||
               normalizedHeader === 'service' ||
               normalizedHeader.includes('product')) {
        mapping[header] = 'service_type';
      }
      // Review Text - very flexible
      else if (normalizedHeader.includes('review') || 
               normalizedHeader.includes('feedback') ||
               normalizedHeader.includes('comment') ||
               normalizedHeader.includes('description') ||
               normalizedHeader.includes('text')) {
        mapping[header] = 'review_text';
      }
      // Rating - handle "Review Ra" truncated header
      else if (normalizedHeader.includes('rating') || 
               normalizedHeader.includes('reviewra') ||
               normalizedHeader === 'score' ||
               normalizedHeader.includes('rate')) {
        mapping[header] = 'review_rating';
      }
      // Location - handle "Issue Loca" truncated header
      else if (normalizedHeader.includes('location') || 
               normalizedHeader.includes('issueloca') ||
               normalizedHeader.includes('branch') ||
               normalizedHeader.includes('place')) {
        mapping[header] = 'issue_location';
      }
      // Bank Contact
      else if (normalizedHeader.includes('bank') || 
               normalizedHeader.includes('contacted') ||
               normalizedHeader.includes('employee') ||
               normalizedHeader.includes('staff') ||
               normalizedHeader.includes('person')) {
        mapping[header] = 'contacted_bank_person';
      }
      // Date
      else if (normalizedHeader.includes('date') || 
               normalizedHeader.includes('created') ||
               normalizedHeader.includes('time')) {
        mapping[header] = 'created_at';
      }
    });
    
    console.log('Final column mapping:', mapping);
    return mapping;
  };

  const getServiceTypeMapping = (serviceType: string): 'ATM' | 'OnlineBanking' | 'CoreBanking' => {
    if (!serviceType) return 'ATM';
    
    const normalizedService = serviceType.toLowerCase().trim();
    console.log('Mapping service type:', serviceType, 'normalized:', normalizedService);
    
    // Handle specific cases from the CSV
    if (normalizedService.includes('core') || 
        normalizedService.includes('operations') ||
        normalizedService.includes('branch') || 
        normalizedService.includes('counter')) {
      return 'CoreBanking';
    }
    if (normalizedService.includes('atm')) {
      return 'ATM';
    }
    if (normalizedService.includes('online') || 
        normalizedService.includes('internet') || 
        normalizedService.includes('mobile') ||
        normalizedService.includes('digital')) {
      return 'OnlineBanking';
    }
    
    // Default fallback
    return 'ATM';
  };

  const parseCSV = (csvText: string): CSVRow[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('CSV Headers detected:', headers);
    
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: CSVRow = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }

    console.log('Parsed', rows.length, 'rows from CSV');
    return rows;
  };

  const mapRowToFeedback = (row: CSVRow, headers: string[], rowIndex: number): Omit<Feedback, 'id' | 'created_at' | 'updated_at'> => {
    try {
      const columnMapping = getColumnMapping(headers);
      const mappedRow: any = {};
      
      // Map columns using the dynamic mapping
      Object.entries(row).forEach(([csvColumn, value]) => {
        if (columnMapping[csvColumn]) {
          mappedRow[columnMapping[csvColumn]] = value;
        }
      });

      console.log('Row', rowIndex + 1, 'mapped data:', mappedRow);

      // Ensure required fields
      if (!mappedRow.customer_name || mappedRow.customer_name.trim() === '') {
        throw new Error(`Customer name missing in row ${rowIndex + 1}`);
      }
      if (!mappedRow.review_text || mappedRow.review_text.trim() === '') {
        throw new Error(`Review text missing in row ${rowIndex + 1}`);
      }

      // Process and validate data
      const serviceType = getServiceTypeMapping(mappedRow.service_type);
      const rating = parseInt(mappedRow.review_rating) || 0;

      return {
        customer_name: mappedRow.customer_name.trim(),
        customer_id: mappedRow.customer_id || null,
        customer_phone: mappedRow.customer_phone || null,
        customer_email: mappedRow.customer_email || null,
        service_type: serviceType,
        review_text: mappedRow.review_text.trim(),
        review_rating: rating,
        issue_location: mappedRow.issue_location || null,
        contacted_bank_person: mappedRow.contacted_bank_person || null,
        status: 'new' as const,
        sentiment: 'neutral' as const,
        detected_issues: [],
      };
    } catch (error) {
      throw new Error(`Row ${rowIndex + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setUploadStats({ total: 0, processed: 0, errors: 0 });
    setErrorDetails([]);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      const firstLine = text.split('\n')[0];
      const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
      
      console.log('Starting processing with headers:', headers);

      const stats = { total: rows.length, processed: 0, errors: 0 };
      const errors: string[] = [];
      setUploadStats({ ...stats });

      // Process rows sequentially to avoid overwhelming the system
      for (let i = 0; i < rows.length; i++) {
        try {
          const feedback = mapRowToFeedback(rows[i], headers, i);
          
          // Wrap createFeedback in a Promise since it returns void
          await new Promise<void>((resolve, reject) => {
            try {
              createFeedback(feedback);
              setTimeout(() => resolve(), 100); // Small delay to prevent overwhelming
            } catch (error) {
              reject(error);
            }
          });
          
          stats.processed++;
        } catch (error) {
          const errorMsg = `Row ${i + 1}: ${error instanceof Error ? error.message : 'Processing failed'}`;
          console.error('Processing error:', errorMsg);
          errors.push(errorMsg);
          stats.errors++;
        }

        // Update progress every 10 rows or at the end
        if (i % 10 === 0 || i === rows.length - 1) {
          const progressPercent = Math.round(((i + 1) / rows.length) * 100);
          setProgress(progressPercent);
          setUploadStats({ ...stats });
          setErrorDetails([...errors]);
        }
      }

      toast({
        title: "Upload Complete",
        description: `Successfully processed ${stats.processed} records with ${stats.errors} errors.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setUploadStats(null);
      setProgress(0);
      setErrorDetails([]);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file.",
        variant: "destructive",
      });
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadStats(null);
    setProgress(0);
    setErrorDetails([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload Feedback Data</span>
        </CardTitle>
        <CardDescription>
          Select a CSV file containing customer feedback data. The system will automatically detect column headers and map them appropriately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!file ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="max-w-sm mx-auto"
            />
            <p className="text-sm text-gray-500 mt-2">
              Drag and drop your CSV file here, or click to browse
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={clearFile}>
                <X className="w-4 h-4" />
                Clear
              </Button>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Processing...</span>
                  <span className="text-sm text-gray-500">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            {uploadStats && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{uploadStats.total}</div>
                  <div className="text-sm text-blue-600">Total Records</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{uploadStats.processed}</div>
                  <div className="text-sm text-green-600">Processed</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{uploadStats.errors}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
              </div>
            )}

            {errorDetails.length > 0 && (
              <div className="max-h-40 overflow-y-auto bg-red-50 p-3 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Error Details:</h4>
                <div className="space-y-1">
                  {errorDetails.slice(0, 10).map((error, index) => (
                    <p key={index} className="text-xs text-red-600">{error}</p>
                  ))}
                  {errorDetails.length > 10 && (
                    <p className="text-xs text-red-600">... and {errorDetails.length - 10} more errors</p>
                  )}
                </div>
              </div>
            )}

            <Button 
              onClick={processFile} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Feedback Data
                </>
              )}
            </Button>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Expected CSV Format:</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <Badge variant="outline" className="mr-2">Customer Name (Required)</Badge>
            <Badge variant="outline" className="mr-2">Review Text (Required)</Badge>
            <Badge variant="outline" className="mr-2">Rating</Badge>
            <Badge variant="outline" className="mr-2">Service Type</Badge>
            <p className="mt-2 text-xs">
              Optional: Customer ID, Phone, Email, Location, Bank Contact, Date
            </p>
            <p className="mt-2 text-xs font-medium">
              Note: Column headers will be automatically detected and mapped (supports truncated headers)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkUpload;
