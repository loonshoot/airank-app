import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the destinations.json file
    const fileContents = await fs.readFile(
      process.cwd() + '/src/data/catalogs/destinations.json', 
      'utf8'
    );
    
    // Parse the JSON data
    const destinations = JSON.parse(fileContents);
    
    // Return the destinations data
    return NextResponse.json(destinations);
  } catch (error) {
    console.error('Error reading destinations catalog:', error);
    return NextResponse.json(
      { error: 'Failed to load destinations catalog' },
      { status: 500 }
    );
  }
} 