/**
 * FinSight AI - Institutional Chart Export Utilities
 * Provides high-DPI Canvas PNG rasterization from SVG charts and RFC-4180 compliant CSV dataset export.
 */

/**
 * Exports an SVG element as a crisp, high-DPI PNG image with institutional branding.
 */
export async function exportChartSvgToPng(
  svgElement: SVGSVGElement | null,
  filename: string,
  isLightMode: boolean = false,
  chartTitle?: string
): Promise<void> {
  if (!svgElement) {
    console.warn('[FinSight AI] Export failed: SVG element not found.');
    return;
  }

  try {
    // 1. Clone SVG to avoid modifying live DOM
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    const bbox = svgElement.getBoundingClientRect();
    const width = bbox.width > 0 ? bbox.width : 800;
    const height = bbox.height > 0 ? bbox.height : 380;

    clonedSvg.setAttribute('width', `${width}`);
    clonedSvg.setAttribute('height', `${height}`);

    // Serialize SVG to XML string
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clonedSvg);

    // Encode XML into SVG Blob
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // 2. Load into HTML Image
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = url;
    });

    // 3. Create high-resolution Canvas (2x scale for retina/high-DPI printing)
    const scale = 2;
    const canvas = document.createElement('canvas');
    const headerHeight = chartTitle ? 40 : 16;
    const footerHeight = 32;

    canvas.width = Math.round(width * scale);
    canvas.height = Math.round((height + headerHeight + footerHeight) * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }

    ctx.scale(scale, scale);

    // 4. Background Fill
    ctx.fillStyle = isLightMode ? '#FFFFFF' : '#080B11';
    ctx.fillRect(0, 0, width, height + headerHeight + footerHeight);

    // Card border
    ctx.strokeStyle = isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, width - 2, height + headerHeight + footerHeight - 2);

    // 5. Header Branding & Title
    if (chartTitle) {
      ctx.fillStyle = isLightMode ? '#0F172A' : '#F8FAFC';
      ctx.font = 'bold 16px "Outfit", "Inter", sans-serif';
      ctx.fillText(chartTitle, 20, 28);
    }

    // 6. Draw SVG Chart
    ctx.drawImage(img, 0, headerHeight, width, height);

    // 7. Footer Watermark
    ctx.fillStyle = isLightMode ? '#64748B' : '#94A3B8';
    ctx.font = '11px "Inter", sans-serif';
    const watermarkText = 'FinSight AI · Institutional Quantitative Intelligence Platform';
    const dateText = new Date().toISOString().slice(0, 10);
    ctx.fillText(watermarkText, 20, height + headerHeight + footerHeight - 12);
    ctx.fillText(dateText, width - 90, height + headerHeight + footerHeight - 12);

    // 8. Trigger Download
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    downloadLink.href = pngUrl;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[FinSight AI] Chart PNG export error:', err);
  }
}

/**
 * Exports structured dataset into standard RFC-4180 CSV file and triggers browser download.
 */
export function exportSeriesToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  try {
    const sanitizeCell = (cell: any): string => {
      if (cell === null || cell === undefined) return '';
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(sanitizeCell).join(','),
      ...rows.map(row => row.map(sanitizeCell).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[FinSight AI] CSV export error:', err);
  }
}
