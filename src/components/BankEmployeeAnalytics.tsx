
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar";
import { Star, TrendingUp, Users, CheckCircle } from 'lucide-react';
import EmployeePerformanceChart from '@/components/charts/EmployeePerformanceChart';

const BankEmployeeAnalytics = () => {
  // Mock employee data
  const employees = [
    {
      id: 'EMP001',
      name: 'Rajesh Kumar',
      department: 'Customer Service',
      contactedCount: 45,
      avgRating: 4.2,
      resolvedIssues: 38,
      resolutionRate: 84.4,
      responseTime: '2.3 hrs',
      location: 'Mumbai',
      status: 'active'
    },
    {
      id: 'EMP002', 
      name: 'Priya Sharma',
      department: 'Technical Support',
      contactedCount: 67,
      avgRating: 4.6,
      resolvedIssues: 61,
      resolutionRate: 91.0,
      responseTime: '1.8 hrs',
      location: 'Delhi',
      status: 'active'
    },
    {
      id: 'EMP003',
      name: 'Amit Patel',
      department: 'Branch Operations',
      contactedCount: 32,
      avgRating: 3.8,
      resolvedIssues: 24,
      resolutionRate: 75.0,
      responseTime: '3.1 hrs',
      location: 'Bangalore',
      status: 'active'
    },
    {
      id: 'EMP004',
      name: 'Sneha Reddy',
      department: 'Digital Banking',
      contactedCount: 89,
      avgRating: 4.4,
      resolvedIssues: 78,
      resolutionRate: 87.6,
      responseTime: '2.0 hrs',
      location: 'Hyderabad',
      status: 'active'
    },
    {
      id: 'EMP005',
      name: 'Vikram Singh',
      department: 'ATM Operations',
      contactedCount: 28,
      avgRating: 4.1,
      resolvedIssues: 23,
      resolutionRate: 82.1,
      responseTime: '2.7 hrs',
      location: 'Chennai',
      status: 'active'
    }
  ];

  const getPerformanceBadge = (rating: number) => {
    if (rating >= 4.5) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (rating >= 4.0) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (rating >= 3.5) return { label: 'Average', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Active Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-blue-100 text-sm">Currently handling feedback</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Star className="w-5 h-5 mr-2" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(employees.reduce((sum, emp) => sum + emp.avgRating, 0) / employees.length).toFixed(1)}
            </div>
            <p className="text-green-100 text-sm">Overall performance</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Resolution Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(employees.reduce((sum, emp) => sum + emp.resolutionRate, 0) / employees.length)}%
            </div>
            <p className="text-purple-100 text-sm">Average across team</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Total Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.reduce((sum, emp) => sum + emp.contactedCount, 0)}
            </div>
            <p className="text-orange-100 text-sm">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance Trends</CardTitle>
          <CardDescription>Performance metrics over time</CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeePerformanceChart />
        </CardContent>
      </Card>

      {/* Employee Details */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance Details</CardTitle>
          <CardDescription>Individual employee statistics and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {employees.map((employee) => {
              const performanceBadge = getPerformanceBadge(employee.avgRating);
              
              return (
                <Card key={employee.id} className="p-4">
                  <div className="flex items-start space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-blue-100 text-blue-800 font-semibold">
                        {getInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{employee.name}</h3>
                          <p className="text-sm text-gray-600">{employee.department} • {employee.location}</p>
                        </div>
                        <Badge className={performanceBadge.color}>
                          {performanceBadge.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-blue-600">{employee.contactedCount}</div>
                          <div className="text-xs text-gray-600">Contacts</div>
                        </div>
                        
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-green-600">{employee.avgRating.toFixed(1)}</div>
                          <div className="text-xs text-gray-600">Avg Rating</div>
                        </div>
                        
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-purple-600">{employee.resolvedIssues}</div>
                          <div className="text-xs text-gray-600">Resolved</div>
                        </div>
                        
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-orange-600">{employee.resolutionRate}%</div>
                          <div className="text-xs text-gray-600">Success Rate</div>
                        </div>
                        
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-red-600">{employee.responseTime}</div>
                          <div className="text-xs text-gray-600">Avg Response</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Resolution Rate</span>
                          <span>{employee.resolutionRate}%</span>
                        </div>
                        <Progress value={employee.resolutionRate} className="h-2" />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankEmployeeAnalytics;
