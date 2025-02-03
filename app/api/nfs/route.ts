import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'nfs.json');

async function readMetrics() {
  try {
    const data = await fs.promises.readFile(dataPath, 'utf8');
    const parsed = JSON.parse(data);
    // Ensure we always return an array of metrics.
    return Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
  } catch (error: any) {
    // If the file doesn't exist, return an empty array.
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function GET() {
  try {
    const metrics = await readMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load metrics' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const newData = await request.json();

    // Validate that newData is an array.
    if (!Array.isArray(newData)) {
      return NextResponse.json(
        { error: 'Invalid data format, expected array' },
        { status: 400 }
      );
    }

    // Ensure the directory exists.
    await fs.promises.mkdir(path.dirname(dataPath), { recursive: true });
    // Write the new data to the file, formatting for readability.
    await fs.promises.writeFile(dataPath, JSON.stringify(newData, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save metrics' },
      { status: 500 }
    );
  }
}
