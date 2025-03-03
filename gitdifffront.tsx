'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DiffViewer() {
  const [branch1, setBranch1] = useState('');
  const [branch2, setBranch2] = useState('');
  const [filePath, setFilePath] = useState('');
  const [diffHtml, setDiffHtml] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFetchDiff = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/diff?branch1=${encodeURIComponent(branch1)}&branch2=${encodeURIComponent(branch2)}&file_path=${encodeURIComponent(filePath)}`
      );
      const text = await res.text();
      setDiffHtml(text);
    } catch (err) {
      console.error('Error fetching diff:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>GitLab File Diff Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Branch 1:</label>
              <Input
                value={branch1}
                onChange={(e) => setBranch1(e.target.value)}
                placeholder="Enter first branch"
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Branch 2:</label>
              <Input
                value={branch2}
                onChange={(e) => setBranch2(e.target.value)}
                placeholder="Enter second branch"
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">File Path:</label>
              <Input
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="Enter file path (e.g., src/app.py)"
                className="mt-1"
              />
            </div>
            <Button onClick={handleFetchDiff} disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Diff'}
            </Button>
          </div>
        </CardContent>
      </Card>
      {diffHtml && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Diff Output</CardTitle>
            </CardHeader>
            <CardContent>
              {/* The diff HTML is inserted directly.
                  Be cautious with dangerous HTML in production. */}
              <div dangerouslySetInnerHTML={{ __html: diffHtml }} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
