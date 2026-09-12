/**
 * Master Test Runner for Citizen Mobile Core Services
 * Runs all unit test suites and outputs clear pass/fail status.
 */

import { runReportQueueTests } from './reportQueue.test';
import { runReportServiceTests } from './reportService.test';
import { runLocationServiceTests } from './locationService.test';
import { runNetworkServiceTests } from './networkService.test';
import { runCameraPhotoEvidenceTests } from './cameraPhotoEvidence.test';

async function main() {
  console.log('====================================================');
  console.log('  GARUD DRISHTI — Citizen Mobile App Unit Tests');
  console.log('  Testing Phase 1 to Phase 6 Core Workflows');
  console.log('====================================================\n');

  try {
    await runReportQueueTests();
    await runReportServiceTests();
    await runLocationServiceTests();
    await runNetworkServiceTests();
    await runCameraPhotoEvidenceTests();

    console.log('\n====================================================');
    console.log('  🎉 ALL UNIT TESTS PASSED SUCCESSFULLY! (5/5 Suites)');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ UNIT TEST FAILURE:', err);
    process.exit(1);
  }
}

main();
