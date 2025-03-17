'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function DashboardPage() {
  // State management
  const [availableForms, setAvailableForms] = useState([]);
  const [metricsData, setMetricsData] = useState({});

  // Fetch list of available forms on mount
  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5000/api/forms');
        if (!res.ok) throw new Error('Error fetching forms');
        const data = await res.json();
        setAvailableForms(data.forms);
      } catch (err) {
        console.error('Error fetching forms', err);
      }
    };
    fetchForms();
  }, []);

  // Fetch metrics data for a form
  const fetchMetricsData = async (formName) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/form/metrics?name=${encodeURIComponent(formName)}`);
      if (!res.ok) throw new Error('Error fetching metrics');
      const data = await res.json();
      setMetricsData((prev) => ({ ...prev, [formName]: data }));
    } catch (err) {
      console.error(`Error fetching metrics for ${formName}`, err);
    }
  };

  // Fetch metrics for all forms on initial load
  useEffect(() => {
    availableForms.forEach((form) => {
      if (!metricsData[form]) fetchMetricsData(form);
    });
  }, [availableForms]);

  // Render graphs for a form
  const renderGraphs = (formName) => {
    const data = metricsData[formName];
    if (!data) return <p>Loading metrics...</p>;

    return (
      <div className="space-y-6">
        {data.submissions_over_time && (
          <div>
            <h4 className="text-md font-semibold">Submissions Over Time</h4>
            <LineChart width={500} height={300} data={data.submissions_over_time}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" />
            </LineChart>
          </div>
        )}
        {/* Add more graphs as metrics are specified */}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Form Dashboard</h1>
      {/* Grid of form cards with graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableForms.map((form) => (
          <Card key={form} className="w-full">
            <CardHeader>
              <CardTitle>{form}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderGraphs(form)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
