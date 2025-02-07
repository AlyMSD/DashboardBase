'use client';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function NameDataDashboard() {
  const [selectedName, setSelectedName] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const names = ['John', 'Alice', 'Bob', 'Emma', 'Michael'];

  const fetchNameData = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const response = await fetch('/api/mongo-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: selectedName }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Transform data for bar charts
  const getDaStepsData = () => {
    if (!data) return [];
    return [
      { name: 'Pre-Install', Manual: data.DaSteps.manual['pre-install'], Automated: data.DaSteps.automated['pre-install'] },
      { name: 'Install', Manual: data.DaSteps.manual.install, Automated: data.DaSteps.automated.install },
      { name: 'Post-Install', Manual: data.DaSteps.manual['post-install'], Automated: data.DaSteps.automated['post-install'] },
    ];
  };

  const getUpgradeStepsData = () => {
    if (!data) return [];
    return [
      { name: 'Pre-Check', Manual: data.upgradeSteps.manual['pre-check'], Automated: data.upgradeSteps.automated['pre-check'] },
      { name: 'Upgrade', Manual: data.upgradeSteps.manual.upgrade, Automated: data.upgradeSteps.automated.upgrade },
      { name: 'Post-Check', Manual: data.upgradeSteps.manual['post-check'], Automated: data.upgradeSteps.automated['post-check'] },
    ];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex space-x-4">
        <Select onValueChange={setSelectedName}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Name" />
          </SelectTrigger>
          <SelectContent>
            {names.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={fetchNameData} disabled={!selectedName || loading}>
          {loading ? 'Loading...' : 'Fetch Data'}
        </Button>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-5 gap-4">
            {['value1', 'value2', 'value3', 'value4', 'value5'].map(value => (
              <Card key={value}>
                <CardHeader>
                  <CardTitle>{value.toUpperCase()}</CardTitle>
                </CardHeader>
                <CardContent>
                  {data[value]}
                </CardContent>
              </Card>
            ))}
          </div>
          <TooltipProvider>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>DA Steps Automation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tooltip>
                    <TooltipTrigger className="w-full">
                      <Progress 
                        value={calculatePercentage(
                          data.DaSteps.automated.total,
                          data.DaSteps.manual.total
                        )}
                        className="h-2 w-full"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="grid gap-1">
                        <div className="flex justify-between">
                          <span className="text-[red]">Automated:</span>
                          <span>{data.DaSteps.automated.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#FFFFFF]">Manual:</span>
                          <span>{data.DaSteps.manual.total}</span>
                        </div>
                        
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {calculatePercentage(data.DaSteps.automated.total, data.DaSteps.manual.total)}% Automated
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upgrade Steps Automation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tooltip>
                    <TooltipTrigger className="w-full">
                      <Progress 
                        value={calculatePercentage(
                          data.upgradeSteps.automated.total,
                          data.upgradeSteps.manual.total
                        )}
                        className="h-2 w-full"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="grid gap-1">
                        <div className="flex justify-between">
                          <span className="text-[#82ca9d]">Automated:</span>
                          <span>{data.upgradeSteps.automated.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8884d8]">Manual:</span>
                          <span>{data.upgradeSteps.manual.total}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-medium">
                          <span>Total:</span>
                          <span>{data.upgradeSteps.automated.total + data.upgradeSteps.manual.total}</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {calculatePercentage(data.upgradeSteps.automated.total, data.upgradeSteps.manual.total)}% Automated
                  </div>
                </CardContent>
              </Card>
            </div>
          </TooltipProvider>
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>DA Steps Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getDaStepsData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Manual" fill="#8884d8" />
                    <Bar dataKey="Automated" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upgrade Steps Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getUpgradeStepsData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Manual" fill="#8884d8" />
                    <Bar dataKey="Automated" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
