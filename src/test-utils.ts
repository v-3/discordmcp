/**
 * Simple ad-hoc tests for the snowflake extractor utility
 */

import { extractSnowflakes } from './utils.js';

// Test function to run all tests
function runTests() {
  console.log('Running snowflake extractor tests...\n');
  
  // Test 1: Basic extraction
  const test1 = 'Please check channel 123456789012345678 and user 987654321098765432';
  const result1 = extractSnowflakes(test1);
  console.log('Test 1 - Basic extraction:');
  console.log('Input:', test1);
  console.log('Expected: 2 unique IDs');
  console.log('Result:', result1);
  console.log('✅ Pass:', result1.length === 2 && result1.includes('123456789012345678') && result1.includes('987654321098765432'));
  console.log();

  // Test 2: Deduplication
  const test2 = 'ID 123456789012345678 appears twice: 123456789012345678';
  const result2 = extractSnowflakes(test2);
  console.log('Test 2 - Deduplication:');
  console.log('Input:', test2);
  console.log('Expected: 1 unique ID');
  console.log('Result:', result2);
  console.log('✅ Pass:', result2.length === 1 && result2[0] === '123456789012345678');
  console.log();

  // Test 3: Edge cases - too short/long numbers
  const test3 = 'Short: 1234567890123456 Valid: 12345678901234567890 Long: 123456789012345678901';
  const result3 = extractSnowflakes(test3);
  console.log('Test 3 - Edge cases (length validation):');
  console.log('Input:', test3);
  console.log('Expected: 1 valid ID (20 digits)');
  console.log('Result:', result3);
  console.log('✅ Pass:', result3.length === 1 && result3[0] === '12345678901234567890');
  console.log();

  // Test 4: No matches
  const test4 = 'No snowflakes here, just regular text and short numbers like 123';
  const result4 = extractSnowflakes(test4);
  console.log('Test 4 - No matches:');
  console.log('Input:', test4);
  console.log('Expected: 0 IDs');
  console.log('Result:', result4);
  console.log('✅ Pass:', result4.length === 0);
  console.log();

  // Test 5: Null/undefined input
  const result5a = extractSnowflakes(null);
  const result5b = extractSnowflakes(undefined);
  const result5c = extractSnowflakes('');
  console.log('Test 5 - Null/undefined/empty input:');
  console.log('Expected: empty arrays');
  console.log('null result:', result5a);
  console.log('undefined result:', result5b);
  console.log('empty string result:', result5c);
  console.log('✅ Pass:', result5a.length === 0 && result5b.length === 0 && result5c.length === 0);
  console.log();

  // Test 6: Mixed context (realistic Discord usage)
  const test6 = 'Check message 1234567890123456789 in channel 9876543210987654321. User <@1111111111111111111> mentioned role <@&2222222222222222222>';
  const result6 = extractSnowflakes(test6);
  console.log('Test 6 - Realistic Discord context:');
  console.log('Input:', test6);
  console.log('Expected: 4 unique IDs');
  console.log('Result:', result6);
  console.log('✅ Pass:', result6.length === 4);
  console.log();

  // Test 7: Word boundaries
  const test7 = 'Text12345678901234567890text vs text 12345678901234567890 text';
  const result7 = extractSnowflakes(test7);
  console.log('Test 7 - Word boundaries:');
  console.log('Input:', test7);
  console.log('Expected: 1 ID (space-separated)');
  console.log('Result:', result7);
  console.log('✅ Pass:', result7.length === 1 && result7[0] === '12345678901234567890');
  console.log();

  console.log('All tests completed! ✨');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
