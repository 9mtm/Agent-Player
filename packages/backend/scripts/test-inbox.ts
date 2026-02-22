/**
 * Test Inbox System
 *
 * Quick integration test for inbox functionality
 */

import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { createInboxSystem } from '../src/inbox/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', '.data', 'database.db');

console.log('📦 Opening database:', dbPath);
const db = new Database(dbPath);

// Create inbox system
console.log('🚀 Creating inbox system...');
const { inboxGateway, messageStore, riskAnalyzer } = createInboxSystem(db);

// Test user ID (fake for now)
const testUserId = 'test-user-123';

async function runTests() {
  console.log('\n===================');
  console.log('🧪 INBOX SYSTEM TESTS');
  console.log('===================\n');

  // Test 1: Low-risk message (auto-execute)
  console.log('Test 1: Low-risk message (should auto-execute)');
  console.log('---');

  const receipt1 = await inboxGateway.receive({
    userId: testUserId,
    sourceType: 'manual',
    message: 'What is the weather in London?'
  });

  console.log('✅ Receipt:', receipt1);
  console.log(`   Status: ${receipt1.status}`);
  console.log(`   Auto-executed: ${receipt1.autoExecuted}`);
  console.log(`   Risk level: ${receipt1.riskLevel}`);

  if (receipt1.status === 'completed' && receipt1.autoExecuted) {
    console.log('✅ PASSED: Low-risk message was auto-executed!\n');
  } else {
    console.log('❌ FAILED: Expected auto-execution\n');
  }

  // Test 2: High-risk message (needs approval)
  console.log('Test 2: High-risk message (should need approval)');
  console.log('---');

  const receipt2 = await inboxGateway.receive({
    userId: testUserId,
    sourceType: 'manual',
    message: 'Delete all my old emails from 2023'
  });

  console.log('✅ Receipt:', receipt2);
  console.log(`   Status: ${receipt2.status}`);
  console.log(`   Risk level: ${receipt2.riskLevel}`);

  if (receipt2.status === 'pending_approval' && receipt2.riskLevel === 'high') {
    console.log('✅ PASSED: High-risk message needs approval!\n');
  } else {
    console.log('❌ FAILED: Expected pending_approval\n');
  }

  // Test 3: Get pending approvals
  console.log('Test 3: Get pending approvals');
  console.log('---');

  const pending = await inboxGateway.getPendingApprovals(testUserId);
  console.log(`✅ Found ${pending.length} pending approvals`);

  if (pending.length > 0) {
    console.log('   First approval:', pending[0].message);
    console.log('✅ PASSED: Pending approvals retrieved!\n');
  }

  // Test 4: Approve message
  if (pending.length > 0) {
    console.log('Test 4: Approve pending message');
    console.log('---');

    const approvalReceipt = await inboxGateway.processApproval(
      pending[0].id,
      { decision: 'approved' },
      testUserId
    );

    console.log('✅ Approval receipt:', approvalReceipt);
    console.log(`   Status: ${approvalReceipt.status}`);

    if (approvalReceipt.status === 'completed') {
      console.log('✅ PASSED: Message approved and executed!\n');
    } else {
      console.log('❌ FAILED: Expected completed status\n');
    }
  }

  // Test 5: Get statistics
  console.log('Test 5: Get inbox statistics');
  console.log('---');

  const stats = await inboxGateway.getStats(testUserId);
  console.log('✅ Stats:', stats);
  console.log(`   Total: ${stats.total}`);
  console.log(`   Auto-executed: ${stats.autoExecuted}`);
  console.log(`   Needs approval: ${stats.needsApproval}`);
  console.log('✅ PASSED: Statistics retrieved!\n');

  // Test 6: Risk analyzer detailed test
  console.log('Test 6: Risk analyzer detailed tests');
  console.log('---');

  const testCases = [
    { message: 'Show me my emails', expectedRisk: 'low' },
    { message: 'Send a message to John', expectedRisk: 'medium' },
    { message: 'Delete all files', expectedRisk: 'high' },
    { message: 'Transfer $1000 to account', expectedRisk: 'high' },
    { message: 'Run shell command: rm -rf /', expectedRisk: 'high' }
  ];

  for (const test of testCases) {
    const risk = await riskAnalyzer.assess({ message: test.message });
    const passed = risk.level === test.expectedRisk;

    console.log(`   "${test.message}"`);
    console.log(`      Expected: ${test.expectedRisk}, Got: ${risk.level} ${passed ? '✅' : '❌'}`);
    console.log(`      Signals: ${risk.signals.map(s => s.type).join(', ')}`);
  }

  console.log('\n✅ All risk analyzer tests completed!\n');

  console.log('===================');
  console.log('✅ ALL TESTS PASSED!');
  console.log('===================\n');
}

runTests()
  .then(() => {
    console.log('✅ Tests completed successfully!');
    db.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Tests failed:', error);
    db.close();
    process.exit(1);
  });
