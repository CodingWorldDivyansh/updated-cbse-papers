// Test key paper links
const testUrls = [
  // 2025 CBSE Official
  { year: 2025, subject: 'Accountancy QP', url: 'https://www.cbse.gov.in/cbsenew/question-paper/2025/XII/ACCOUNTANCY.zip' },
  { year: 2025, subject: 'Mathematics QP', url: 'https://www.cbse.gov.in/cbsenew/question-paper/2025/XII/MATHEMATICS.zip' },
  { year: 2025, subject: 'Data Science QP', url: 'https://www.cbse.gov.in/cbsenew/question-paper/2025/XII/368_Data_Science.pdf' },
  
  // 2024 CBSE Official
  { year: 2024, subject: 'Accountancy QP', url: 'https://www.cbse.gov.in/cbsenew/question-paper/2024/XII/Accountancy.zip' },
  { year: 2024, subject: 'Economics QP', url: 'https://www.cbse.gov.in/cbsenew/question-paper/2024/XII/Economics.zip' },
  
  // 2018 Mirror Links
  { year: 2018, subject: 'Accountancy Vedantu', url: 'https://www.vedantu.com/content-files-downloadable/previous-year-question-paper/cbse-class-12-accountancy-question-paper-2018.pdf' },
  { year: 2018, subject: 'Accountancy Byjus', url: 'https://cdn1.byjus.com/wp-content/uploads/2021/06/CBSE-Class-12-Accountancy-Question-Paper-2018.pdf' },
  { year: 2018, subject: 'Mathematics Byjus', url: 'https://cdn1.byjus.com/wp-content/uploads/2021/06/CBSE-Class-12-Maths-Question-Paper-2018.pdf' },
  { year: 2018, subject: 'Economics Byjus', url: 'https://cdn1.byjus.com/wp-content/uploads/2021/06/CBSE-Class-12-Economics-Question-Paper-2018.pdf' },
  { year: 2018, subject: 'Business Studies Byjus', url: 'https://cdn1.byjus.com/wp-content/uploads/2021/06/CBSE-Class-12-Business-Studies-Question-Paper-2018.pdf' },
  { year: 2018, subject: 'English Core Byjus', url: 'https://cdn1.byjus.com/wp-content/uploads/2021/06/CBSE-Class-12-English-Core-Question-Paper-2018.pdf' },
  
  // 2015 Mirror Links
  { year: 2015, subject: 'Accountancy Vedantu', url: 'https://www.vedantu.com/content-files-downloadable/previous-year-question-paper/cbse-class-12-accountancy-question-paper-2015.pdf' },
  { year: 2015, subject: 'Accountancy Byjus', url: 'https://cdn1.byjus.com/wp-content/uploads/2021/06/CBSE-Class-12-Accountancy-Question-Paper-2015.pdf' },
  { year: 2015, subject: 'Mathematics Byjus', url: 'https://cdn1.byjus.com/wp-content/uploads/2021/06/CBSE-Class-12-Maths-Question-Paper-2015.pdf' },
  { year: 2015, subject: 'Economics Byjus', url: 'https://cdn1.byjus.com/wp-content/uploads/2021/06/CBSE-Class-12-Economics-Question-Paper-2015.pdf' },
  { year: 2015, subject: 'Business Studies Byjus', url: 'https://cdn1.byjus.com/wp-content/uploads/2021/06/CBSE-Class-12-Business-Studies-Question-Paper-2015.pdf' },
  { year: 2015, subject: 'English Core Byjus', url: 'https://cdn1.byjus.com/wp-content/uploads/2021/06/CBSE-Class-12-English-Core-Question-Paper-2015.pdf' },
  
  // Sample Papers
  { year: 2019, subject: 'Accountancy Sample', url: 'https://cbseacademic.nic.in/web_material/SQP/Class_XII_2018_19/XIIAccountancySQP_2018-19.pdf' },
  { year: 2019, subject: 'Mathematics Sample', url: 'https://cbseacademic.nic.in/web_material/SQP/Class_XII_2018_19/XII_Mathematics_SQP_2018-19.pdf' },
];

async function testUrl(item) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(item.url, { 
      method: 'HEAD', 
      redirect: 'follow',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return {
      ...item,
      status: response.status,
      ok: response.ok || response.status === 200 || response.status === 302
    };
  } catch (error) {
    return {
      ...item,
      status: 'ERROR',
      ok: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('Testing CBSE Paper Links...\n');
  console.log('='.repeat(80));
  
  const results = { passed: 0, failed: 0, errors: [] };
  
  for (const item of testUrls) {
    const result = await testUrl(item);
    const status = result.ok ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} | ${result.year} | ${result.subject} | ${result.status}`);
    
    if (result.ok) {
      results.passed++;
    } else {
      results.failed++;
      results.errors.push(result);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Results: ${results.passed} passed, ${results.failed} failed`);
  
  if (results.errors.length > 0) {
    console.log('\nFailed:');
    results.errors.forEach(err => {
      console.log(`  ${err.year} ${err.subject}: ${err.error || err.status}`);
    });
  }
  
  return results;
}

runTests();
