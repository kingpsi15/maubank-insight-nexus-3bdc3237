import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useFeedback } from '@/hooks/useFeedback';
import CSVTemplate from '@/components/CSVTemplate';
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

  const getServiceTypeMapping = (serviceType: string): 'ATM' | 'OnlineBanking' | 'CoreBanking' => {
    if (!serviceType) return 'ATM';
    
    const normalizedService = serviceType.toLowerCase().trim();
    console.log('Mapping service type:', serviceType, 'normalized:', normalizedService);
    
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
    
    return 'ATM';
  };

  const parseCSV = (csvText: string): { headers: string[], rows: CSVRow[] } => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    // Parse CSV line handling quotes properly
    const parseCSVLine = (line: string): string[] => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
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

    // Always treat first line as headers
    const headers = parseCSVLine(lines[0]);
    console.log('CSV Headers detected:', headers);
    
    const rows: CSVRow[] = [];

    // Parse data rows starting from line 2
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: CSVRow = {};
      
      // Map each value to its corresponding header
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }

    console.log('Parsed', rows.length, 'data rows');
    console.log('Sample row:', rows[0]);
    return { headers, rows };
  };

  const mapRowToFeedback = (row: CSVRow, headers: string[], rowIndex: number): Omit<Feedback, 'id' | 'created_at' | 'updated_at'> => {
    try {
      console.log(`Processing row ${rowIndex + 1}:`, row);
      console.log('Available headers:', headers);

      // Flexible header mapping - check for exact matches first, then partial matches
      const getFieldValue = (possibleNames: string[]): string => {
        // First try exact matches
        for (const name of possibleNames) {
          if (row[name] !== undefined) {
            return row[name] || '';
          }
        }
        
        // Then try case-insensitive partial matches
        for (const name of possibleNames) {
          const found = Object.keys(row).find(key => 
            key.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(key.toLowerCase())
          );
          if (found && row[found]) {
            return row[found];
          }
        }
        
        return '';
      };

      // Map fields using flexible matching
      const customerName = getFieldValue(['Customer Name', 'customer_name', 'name', 'Customer', 'customer']);
      const reviewText = getFieldValue(['Review Text', 'review_text', 'review', 'feedback', 'comment', 'text']);
      const ratingStr = getFieldValue(['Review Rating', 'review_rating', 'rating', 'score']);
      const serviceType = getFieldValue(['Service Type', 'service_type', 'service', 'type']);
      
      console.log('Mapped values:', {
        customerName,
        reviewText,
        rating: ratingStr,
        serviceType
      });

      // Validate required fields
      if (!customerName || customerName.trim() === '') {
        console.error('Missing customer name in row:', row);
        throw new Error(`Customer name is required`);
      }
      
      if (!reviewText || reviewText.trim() === '') {
        throw new Error(`Review text is required`);
      }

      const rating = parseInt(ratingStr) || 0;
      const mappedServiceType = getServiceTypeMapping(serviceType);

      return {
        customer_name: customerName.trim(),
        customer_id: getFieldValue(['Customer ID', 'customer_id', 'id']) || null,
        customer_phone: getFieldValue(['Customer Phone', 'customer_phone', 'phone']) || null,
        customer_email: getFieldValue(['Customer Email', 'customer_email', 'email']) || null,
        service_type: mappedServiceType,
        review_text: reviewText.trim(),
        review_rating: rating,
        issue_location: getFieldValue(['Issue Location', 'issue_location', 'location']) || null,
        contacted_bank_person: getFieldValue(['Contacted Bank Person', 'contacted_bank_person', 'bank_person', 'employee']) || null,
        status: 'new' as const,
        sentiment: 'neutral' as const,
        detected_issues: [],
      };
    } catch (error) {
      console.error('Error processing row:', error, 'Row data:', row);
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
      const { headers, rows } = parseCSV(text);
      
      if (rows.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      console.log('Starting processing with headers:', headers);
      console.log('Sample row:', rows[0]);

      const stats = { total: rows.length, processed: 0, errors: 0 };
      const errors: string[] = [];
      setUploadStats({ ...stats });

      // Process rows in batches for better performance
      const batchSize = 10;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (row, batchIndex) => {
            const rowIndex = i + batchIndex;
            try {
              const feedback = mapRowToFeedback(row, headers, rowIndex);
              await new Promise<void>((resolve, reject) => {
                try {
                  createFeedback(feedback);
                  setTimeout(() => resolve(), 10); // Small delay to prevent overwhelming
                } catch (error) {
                  reject(error);
                }
              });
              
              stats.processed++;
            } catch (error) {
              const errorMsg = `Row ${rowIndex + 1}: ${error instanceof Error ? error.message : 'Processing failed'}`;
              console.error('Processing error:', errorMsg);
              errors.push(errorMsg);
              stats.errors++;
            }
          })
        );

        // Update progress every batch
        const progressPercent = Math.round(((i + batch.length) / rows.length) * 100);
        setProgress(progressPercent);
        setUploadStats({ ...stats });
        setErrorDetails([...errors.slice(0, 20)]); // Show only first 20 errors
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
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
          Select a CSV file containing customer feedback data. Download the template below if you need the correct format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <CSVTemplate />
        
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
            <Badge variant="outline" className="mr-2">Review Rating</Badge>
            <Badge variant="outline" className="mr-2">Service Type</Badge>
            <p className="mt-2 text-xs">
              Optional: Customer ID, Customer Phone, Customer Email, Issue Location, Contacted Bank Person, Date
            </p>
            <p className="mt-2 text-xs font-medium">
              Note: First row must contain column headers. Download the template above for the exact format.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkUpload;
