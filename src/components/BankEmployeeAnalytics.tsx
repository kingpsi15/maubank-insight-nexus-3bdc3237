
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, TrendingUp, Users, CheckCircle } from 'lucide-react';
import EmployeePerformanceChart from '@/components/charts/EmployeePerformanceChart';
import { useQuery } from '@tanstack/react-query';
import { employeeService } from '@/services';

const BankEmployeeAnalytics = () => {
  // Fetch employee statistics from database
  const { data: employeeStats = [], isLoading, error } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: () => employeeService.getEmployeeStats(),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-red-800">
                Failed to load employee data. Please check your database connection.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employeeStats || employeeStats.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-gray-600">No employee data available. Please add employee records and feedback interactions to the database.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPerformanceBadge = (rating: number) => {
    if (rating >= 4.5) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (rating >= 4.0) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (rating >= 3.5) return { label: 'Average', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Calculate aggregate statistics from employee stats with proper type checking
  const avgRating: number = employeeStats.length > 0 ? 
    (employeeStats as any[]).reduce((sum: number, emp: any) => sum + (Number(emp.avg_rating) || 0), 0) / employeeStats.length : 0;
  
  const totalContacts: number = (employeeStats as any[]).reduce((sum: number, emp: any) => sum + (Number(emp.contacted_count) || 0), 0);
  
  const avgResolutionRate: number = employeeStats.length > 0 ? 
    (employeeStats as any[]).reduce((sum: number, emp: any) => {
      const totalInteractions = Number(emp.total_interactions) || 0;
      const resolvedCount = Number(emp.resolved_count) || 0;
      const rate = totalInteractions > 0 ? (resolvedCount / totalInteractions) * 100 : 0;
      return sum + rate;
    }, 0) / employeeStats.length : 0;

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
            <div className="text-2xl font-bold">{employeeStats.length}</div>
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
            <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
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
            <div className="text-2xl font-bold">{Math.round(avgResolutionRate)}%</div>
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
            <div className="text-2xl font-bold">{totalContacts}</div>
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
            {(employeeStats as any[]).map((employee: any) => {
              const totalInteractions = Number(employee.total_interactions) || 0;
              const resolvedCount = Number(employee.resolved_count) || 0;
              const resolutionRate = totalInteractions > 0 ? 
                (resolvedCount / totalInteractions) * 100 : 0;
              const performanceBadge = getPerformanceBadge(Number(employee.avg_rating) || 0);
              
              return (
                <Card key={employee.employee_id} className="p-4">
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
                          <p className="text-sm text-gray-600">{employee.department} • {employee.branch_location}</p>
                        </div>
                        <Badge className={performanceBadge.color}>
                          {performanceBadge.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-blue-600">{Number(employee.contacted_count) || 0}</div>
                          <div className="text-xs text-gray-600">Contacts</div>
                        </div>
                        
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-green-600">{(Number(employee.avg_rating) || 0).toFixed(1)}</div>
                          <div className="text-xs text-gray-600">Avg Rating</div>
                        </div>
                        
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-purple-600">{Number(employee.resolved_count) || 0}</div>
                          <div className="text-xs text-gray-600">Resolved</div>
                        </div>
                        
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-orange-600">{resolutionRate.toFixed(1)}%</div>
                          <div className="text-xs text-gray-600">Success Rate</div>
                        </div>
                        
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xl font-bold text-red-600">N/A</div>
                          <div className="text-xs text-gray-600">Avg Response</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Resolution Rate</span>
                          <span>{resolutionRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={resolutionRate} className="h-2" />
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
