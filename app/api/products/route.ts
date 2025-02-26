import axios from 'axios';
import formidable from 'formidable';
import FormData from 'form-data';
import fs from 'fs';
import { URL } from 'url';

export const config = {
  api: {
    bodyParser: false, // Disable built-in body parsing
  },
};

export default async function handler(req, res) {
  const baseFlaskUrl = process.env.FLASK_API_URL || 'http://localhost:5000';
  const { slug = [] } = req.query;

  try {
    // Construct the Flask URL path from the slug
    const path = slug.length > 0 ? `/${slug.join('/')}` : '';
    const url = new URL(path, baseFlaskUrl);

    // Extract client's query parameters (excluding slug)
    const clientQuery = { ...req.query };
    delete clientQuery.slug;

    // Add query parameters to the URL
    url.search = new URLSearchParams(clientQuery).toString();

    if (req.method === 'GET') {
      // Forward GET requests
      const response = await axios.get(url.toString());
      res.status(response.status).json(response.data);
    } else if (req.method === 'POST') {
      // Handle POST requests with file uploads
      const form = new formidable.IncomingForm({ multiples: true });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          res.status(500).json({ error: 'Error parsing form data' });
          return;
        }

        const formData = new FormData();

        // Append text fields
        Object.entries(fields).forEach(([key, values]) => {
          values.forEach(value => {
            formData.append(key, value);
          });
        });

        // Append files
        Object.entries(files).forEach(([key, fileArray]) => {
          fileArray.forEach(file => {
            const readStream = fs.createReadStream(file.filepath);
            formData.append(key, readStream, {
              filename: file.originalFilename || 'file',
              contentType: file.mimetype || 'application/octet-stream',
            });
          });
        });

        try {
          const response = await axios.post(url.toString(), formData, {
            headers: formData.getHeaders(),
          });

          // Cleanup temporary files
          Object.values(files).flat().forEach(file => {
            fs.unlink(file.filepath, () => {});
          });

          res.status(response.status).json(response.data);
        } catch (error) {
          // Cleanup files on error
          Object.values(files).flat().forEach(file => {
            fs.unlink(file.filepath, () => {});
          });

          res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy error' });
        }
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy error' });
  }
}
