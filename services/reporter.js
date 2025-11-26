import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

/**
 * Generate HTML report using k6-reporter
 * 
 * Note: The report is saved as 'report.html' in the current directory.
 * In CI/CD, the workflow moves it to 'results/report.html' automatically.
 * For local runs, the file will be in the root directory.
 * 
 * @param {Object} data - Summary data from k6
 * @returns {Object} Report configuration
 */
export function handleSummary(data) {
  return {
    'report.html': htmlReport(data, {
      title: 'K6 Performance Test Report',
      theme: 'dark', // or 'light'
    }),
  };
}

