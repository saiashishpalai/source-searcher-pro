import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

class PDFParser {
  constructor() {
    this.maxPDFSize = 10 * 1024 * 1024; // 10MB
    this.timeoutMs = 30000; // 30s
    this.cache = new Map(); // key: `${fileId}:${hash}` → { text, pages, info, metadata }
    this.maxCacheSize = 50;
  }

  getCacheKey(fileId, hash) {
    return `${fileId}:${hash || 'nohash'}`;
  }

  trimCache() {
    if (this.cache.size <= this.maxCacheSize) return;
    const firstKey = this.cache.keys().next().value;
    this.cache.delete(firstKey);
  }

  async downloadFromDrive(fileId, accessToken, expectedSize) {
    if (expectedSize && Number(expectedSize) > this.maxPDFSize) {
      throw new Error(`PDF too large: ${expectedSize} bytes`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length > this.maxPDFSize) {
        throw new Error(`PDF too large after download: ${buffer.length} bytes`);
      }
      return buffer;
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error('PDF download timeout');
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async extractText(buffer) {
    const data = await pdfParse(buffer);
    const rawText = (data.text || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (!rawText) throw new Error('No extractable text');
    return {
      text: rawText,
      pages: data.numpages,
      info: data.info,
      metadata: {
        pages: data.numpages,
        textLength: rawText.length,
        title: data.info?.Title,
        author: data.info?.Author
      }
    };
  }

  async parsePDF(fileId, accessToken, fileSize, contentHash) {
    const cacheKey = this.getCacheKey(fileId, contentHash);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const buffer = await this.downloadFromDrive(fileId, accessToken, fileSize);
    const result = await this.extractText(buffer);
    this.cache.set(cacheKey, result);
    this.trimCache();
    return result;
  }

  clearCache() {
    this.cache.clear();
  }
}

export const pdfParser = new PDFParser();


