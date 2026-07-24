/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', 'mammoth'],
};

module.exports = nextConfig;
