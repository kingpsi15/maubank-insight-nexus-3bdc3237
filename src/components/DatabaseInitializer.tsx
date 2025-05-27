
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { initializeDatabase, seedInitialData } from '@/services/database';
import { Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const DatabaseInitializer = () => {
  const [status, setStatus] = useState<'idle' | 'initializing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleInitialize = async () => {
    setStatus('initializing');
    setMessage('Initializing database...');
    
    try {
      await initializeDatabase();
      setMessage('Database initialized successfully. Seeding initial data...');
      
      await seedInitialData();
      setMessage('Database setup completed successfully!');
      setStatus('success');
    } catch (error) {
      console.error('Database initialization failed:', error);
      setMessage(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="w-6 h-6 mr-2" />
          Database Setup
        </CardTitle>
        <CardDescription>
          Initialize the MySQL database for Mau Bank VoC Analysis System
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">Database Configuration</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Host: localhost</li>
            <li>• Database: maubank_voc</li>
            <li>• Make sure MySQL is running and credentials are correct in database.ts</li>
          </ul>
        </div>

        {status !== 'idle' && (
          <div className={`p-3 rounded-lg ${
            status === 'success' ? 'bg-green-50 text-green-700' :
            status === 'error' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            <div className="flex items-center">
              {status === 'initializing' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {status === 'success' && <CheckCircle className="w-4 h-4 mr-2" />}
              {status === 'error' && <AlertCircle className="w-4 h-4 mr-2" />}
              {message}
            </div>
          </div>
        )}

        <Button 
          onClick={handleInitialize}
          disabled={status === 'initializing'}
          className="w-full"
        >
          {status === 'initializing' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Initialize Database
        </Button>

        {status === 'success' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              Database is ready! You can now use all features of the VoC Analysis System.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DatabaseInitializer;
