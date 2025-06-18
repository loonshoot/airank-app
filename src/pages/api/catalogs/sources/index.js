import path from 'path';
import { promises as fs } from 'fs';

export default async function handler(req, res) {
  // Read the "data.json" file
  const fileContents = await fs.readFile(process.cwd() + '/src/data/catalogs/sources.json', 'utf8');
  // Return the content of the data file in JSON format
  res.status(200).json(JSON.parse(fileContents));
}