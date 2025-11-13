// Utility functions for exporting waitlist data

export interface WaitlistSignup {
  id: string;
  full_name: string | null;
  email: string;
  company_name: string | null;
  job_title: string | null;
  whatsapp_number: string | null;
  whatsapp_country_code: string | null;
  company_size: string;
  primary_use_case: string;
  pain_level: string;
  agree_to_contact: boolean;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  user_agent: string | null;
  created_at: string;
  invite_email_sent?: boolean;
  invite_email_sent_at?: string | null;
  maintenance_email_sent?: boolean;
  maintenance_email_sent_at?: string | null;
}

/**
 * Export waitlist data to CSV format
 */
export function exportToCSV(data: WaitlistSignup[]): void {
  if (data.length === 0) {
    return;
  }

  // CSV headers
  const headers = [
    'Name',
    'Email',
    'Company Name',
    'Job Title',
    'WhatsApp',
    'Company Size',
    'Use Case',
    'Pain Level',
    'UTM Source',
    'UTM Medium',
    'UTM Campaign',
    'Signup Date'
  ];

  // Convert data to CSV rows
  const rows = data.map(item => [
    `"${escapeCSV(item.full_name || 'N/A')}"`,
    `"${escapeCSV(item.email)}"`,
    `"${escapeCSV(item.company_name || 'N/A')}"`,
    `"${escapeCSV(item.job_title || 'N/A')}"`,
    `"${formatWhatsApp(item.whatsapp_country_code, item.whatsapp_number)}"`,
    `"${escapeCSV(item.company_size)}"`,
    `"${escapeCSV(item.primary_use_case)}"`,
    `"${escapeCSV(item.pain_level)}"`,
    `"${escapeCSV(item.utm_source || 'N/A')}"`,
    `"${escapeCSV(item.utm_medium || 'N/A')}"`,
    `"${escapeCSV(item.utm_campaign || 'N/A')}"`,
    `"${formatDate(item.created_at)}"`
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `haven7-waitlist-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export waitlist data to JSON format
 */
export function exportToJSON(data: WaitlistSignup[]): void {
  if (data.length === 0) {
    return;
  }

  // Create formatted JSON
  const jsonContent = JSON.stringify(data, null, 2);
  
  // Create blob and download
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `haven7-waitlist-${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Escape special characters for CSV
 */
function escapeCSV(value: string | null | undefined): string {
  if (!value) return 'N/A';
  // Replace double quotes with two double quotes
  return value.replace(/"/g, '""');
}

/**
 * Format WhatsApp number with country code
 */
function formatWhatsApp(countryCode: string | null, number: string | null): string {
  if (!number) return '';
  return countryCode && countryCode !== '+1' ? `${countryCode} ${number}` : number;
}

/**
 * Format date to readable string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

