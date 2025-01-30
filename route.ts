import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'metrics.json');

async function readMetrics() {
  try {
    const data = await fs.promises.readFile(dataPath, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
  } catch (error: any) {
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
    
    if (!Array.isArray(newData)) {
      return NextResponse.json(
        { error: 'Invalid data format, expected array' },
        { status: 400 }
      );
    }

    await fs.promises.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.promises.writeFile(dataPath, JSON.stringify(newData, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save metrics' },
      { status: 500 }
    );
  }
}