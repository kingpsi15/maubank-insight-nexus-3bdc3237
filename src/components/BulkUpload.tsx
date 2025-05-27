
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useFeedback } from '@/hooks/useFeedback';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { createFeedback } = useFeedback();

  // Improved column mapping with more flexible matching
  const getColumnMapping = (headers: string[]) => {
    const mapping: { [key: string]: string } = {};
    
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      
      // Customer Name variations
      if (normalizedHeader.includes('customer') && normalizedHeader.includes('name')) {
        mapping[header] = 'customer_name';
      }
      // Customer ID variations
      else if (normalizedHeader.includes('customer') && normalizedHeader.includes('id')) {
        mapping[header] = 'customer_id';
      }
      // Phone variations
      else if (normalizedHeader.includes('phone') || normalizedHeader.includes('mobile') || normalizedHeader.includes('contact')) {
        mapping[header] = 'customer_phone';
      }
      // Email variations
      else if (normalizedHeader.includes('email') || normalizedHeader.includes('mail')) {
        mapping[header] = 'customer_email';
      }
      // Service Type variations
      else if (normalizedHeader.includes('service') && normalizedHeader.includes('type')) {
        mapping[header] = 'service_type';
      }
      // Review Text variations
      else if (normalizedHeader.includes('review') && normalizedHeader.includes('text')) {
        mapping[header] = 'review_text';
      }
      // Rating variations
      else if (normalizedHeader.includes('rating') || normalizedHeader.includes('review') && normalizedHeader.includes('rating')) {
        mapping[header] = 'review_rating';
      }
      // Location variations
      else if (normalizedHeader.includes('location') || normalizedHeader.includes('issue') && normalizedHeader.includes('location')) {
        mapping[header] = 'issue_location';
      }
      // Bank Contact variations
      else if (normalizedHeader.includes('bank') && normalizedHeader.includes('contact')) {
        mapping[header] = 'contacted_bank_person';
      }
      else if (normalizedHeader.includes('contacted') && normalizedHeader.includes('bank')) {
        mapping[header] = 'contacted_bank_person';
      }
      // Date variations
      else if (normalizedHeader.includes('date') || normalizedHeader.includes('created')) {
        mapping[header] = 'created_at';
      }
    });
    
    return mapping;
  };

  const getServiceTypeMapping = (serviceType: string): string => {
    if (!serviceType) return 'ATM';
    
    const normalizedService = serviceType.toLowerCase().trim();
    
    const serviceMap: { [key: string]: string } = {
      'atm': 'ATM',
      'atm services': 'ATM',
      'atm service': 'ATM',
      'online banking': 'OnlineBanking',
      'online': 'OnlineBanking',
      'internet banking': 'OnlineBanking',
      'mobile banking': 'OnlineBanking',
      'mobile': 'OnlineBanking',
      'app': 'OnlineBanking',
      'core banking': 'CoreBanking',
      'core': 'CoreBanking',
      'branch': 'CoreBanking',
      'branch services': 'CoreBanking',
      'counter': 'CoreBanking',
      'teller': 'CoreBanking'
    };

    return serviceMap[normalizedService] || 'ATM';
  };

  const parseCSV = (csvText: string): CSVRow[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: CSVRow = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }

    return rows;
  };

  const mapRowToFeedback = (row: CSVRow, headers: string[], rowIndex: number) => {
    try {
      const columnMapping = getColumnMapping(headers);
      const mappedRow: any = {};
      
      // Map columns using the dynamic mapping
      Object.entries(row).forEach(([csvColumn, value]) => {
        if (columnMapping[csvColumn]) {
          mappedRow[columnMapping[csvColumn]] = value;
        }
      });

      // Ensure required fields with better error messages
      if (!mappedRow.customer_name || mappedRow.customer_name.trim() === '') {
        throw new Error(`Customer name is required but missing in row ${rowIndex + 1}`);
      }
      if (!mappedRow.review_text || mappedRow.review_text.trim() === '') {
        throw new Error(`Review text is required but missing in row ${rowIndex + 1}`);
      }

      // Process and validate data
      return {
        customer_name: mappedRow.customer_name.trim(),
        customer_id: mappedRow.customer_id || null,
        customer_phone: mappedRow.customer_phone || null,
        customer_email: mappedRow.customer_email || null,
        service_type: getServiceTypeMapping(mappedRow.service_type),
        review_text: mappedRow.review_text.trim(),
        review_rating: parseInt(mappedRow.review_rating) || 0,
        issue_location: mappedRow.issue_location || null,
        contacted_bank_person: mappedRow.contacted_bank_person || null,
        status: 'new' as const,
        sentiment: 'neutral' as const,
        detected_issues: [],
        created_at: mappedRow.created_at ? new Date(mappedRow.created_at).toISOString() : new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Row ${rowIndex + 1}: ${error instanceof Error ? error.message : 'Invalid data format'}`);
    }
  };

  const processBatch = async (batch: any[]) => {
    const batchPromises = batch.map(feedback => 
      createFeedback(feedback).catch(error => {
        console.error('Error creating feedback:', error);
        throw error;
      })
    );
    
    await Promise.allSettled(batchPromises);
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setUploadStats({ total: 0, processed: 0, errors: 0 });

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      // Get headers for column mapping
      const firstLine = text.split('\n')[0];
      const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
      
      console.log('Detected headers:', headers);
      console.log('Column mapping:', getColumnMapping(headers));

      const stats = { total: rows.length, processed: 0, errors: 0 };
      setUploadStats({ ...stats });

      // Process in smaller batches
      const batchSize = 5;
      const totalBatches = Math.ceil(rows.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, rows.length);
        const batchRows = rows.slice(startIndex, endIndex);
        
        const feedbackBatch: any[] = [];
        
        // Process each row in the batch
        for (let i = 0; i < batchRows.length; i++) {
          try {
            const feedback = mapRowToFeedback(batchRows[i], headers, startIndex + i);
            feedbackBatch.push(feedback);
          } catch (error) {
            console.error(`Error processing row ${startIndex + i + 1}:`, error);
            stats.errors++;
          }
        }

        // Upload the batch
        if (feedbackBatch.length > 0) {
          try {
            await processBatch(feedbackBatch);
            stats.processed += feedbackBatch.length;
          } catch (error) {
            console.error('Error uploading batch:', error);
            stats.errors += feedbackBatch.length;
          }
        }

        // Update progress
        const progressPercent = Math.round(((batchIndex + 1) / totalBatches) * 100);
        setProgress(progressPercent);
        setUploadStats({ ...stats });

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 200));
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
              Note: Column headers will be automatically detected and mapped
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkUpload;
