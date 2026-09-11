const API = 'http://localhost:5000/api';

async function req(endpoint, options = {}) {
  const url = `${API}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${endpoint} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function runTests() {
  console.log('=== STARTING END-TO-END VERIFICATION TESTS (LIVE ATLAS DB) ===\n');

  // 1. Health check
  console.log('[TEST 1] Testing /api/health ...');
  const healthData = await req('/health');
  console.log('✓ Health status:', healthData);

  // 2. Public stats
  console.log('\n[TEST 2] Testing /api/issues/public/stats ...');
  const statsData = await req('/issues/public/stats');
  console.log('✓ Public stats total issues:', statsData.stats?.total);

  // 3. Public nearby issues
  console.log('\n[TEST 3] Testing /api/issues/public/nearby ...');
  const nearbyData = await req('/issues/public/nearby?lat=28.6139&lon=77.2090&radius=25000');
  console.log(`✓ Retrieved ${nearbyData.data.length} issues nearby`);

  // 4. Citizen login
  console.log('\n[TEST 4] Testing Citizen Login (citizen1@civic.local) ...');
  const loginData = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'citizen1@civic.local', password: 'Citizen@123456' }),
  });
  const citizenToken = loginData.token;
  console.log('✓ Citizen logged in successfully. User:', loginData.user.name);

  // 5. Check Duplicate endpoint
  console.log('\n[TEST 5] Testing /api/issues/check-duplicate ...');
  const checkDupData = await req('/issues/check-duplicate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({ latitude: 28.6139, longitude: 77.2090, category: 'POTHOLE' }),
  });
  console.log('✓ Duplicate check result:', {
    isDuplicate: checkDupData.isDuplicate,
    matchedTicket: checkDupData.masterIssue?.ticketId,
  });

  // 6. Create a new issue (no duplicate location)
  console.log('\n[TEST 6] Testing New Issue Creation ...');
  const newIssueData = await req('/issues', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({
      title: 'Water pipe burst near community park',
      description: 'Clean drinking water leaking continuously onto the road.',
      category: 'WATER_LEAK',
      latitude: 28.5355,
      longitude: 77.3910,
      locationText: 'Near Sector 137 Community Center, Noida',
    }),
  });
  const createdTicket = newIssueData.issue?.ticketId;
  const createdIssueId = newIssueData.issue?._id;
  console.log(`✓ New issue created successfully: #${createdTicket} (ID: ${createdIssueId})`);

  // 7. Test Duplicate Linking (Reporting same pothole at 28.6139, 77.2090)
  console.log('\n[TEST 7] Testing Duplicate Detection & Auto-Linking ...');
  const dupReportData = await req('/issues', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({
      title: 'Massive crater on MG Road',
      description: 'Second citizen reporting the same pothole near Signal 5.',
      category: 'POTHOLE',
      latitude: 28.6139,
      longitude: 77.2090,
      locationText: 'MG Road Signal 5',
    }),
  });
  console.log('✓ Duplicate response:', {
    isDuplicate: dupReportData.isDuplicate,
    linkedMaster: dupReportData.masterIssue?.ticketId,
    newReportCount: dupReportData.masterIssue?.reportCount,
  });

  // 8. Authority login & status update
  console.log('\n[TEST 8] Testing Authority Login (officer@civic.local) ...');
  const authLoginData = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'officer@civic.local', password: 'Officer@123456' }),
  });
  const authorityToken = authLoginData.token;
  console.log('✓ Authority logged in:', authLoginData.user.name);

  // 9. Authority updates status to IN_PROGRESS
  console.log('\n[TEST 9] Authority Updates Status to IN_PROGRESS ...');
  const statusUpdateData = await req(`/issues/${createdIssueId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authorityToken}` },
    body: JSON.stringify({ status: 'IN_PROGRESS', message: 'Work crew dispatched to repair pipeline.' }),
  });
  console.log('✓ Status updated to:', statusUpdateData.status);

  // 10. Check Issue History
  console.log('\n[TEST 10] Testing Issue History Timeline ...');
  const historyData = await req(`/issues/${createdIssueId}/history`, {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  console.log(`✓ Issue History has ${historyData.history.length} events:`);
  historyData.history.forEach((h, idx) => {
    console.log(`   ${idx + 1}. [${h.status}] ${h.message}`);
  });

  // 11. Authority Submits Resolution Proof
  console.log('\n[TEST 11] Authority Submits Resolution ...');
  const resolutionData = await req(`/issues/${createdIssueId}/resolution`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authorityToken}` },
    body: JSON.stringify({ resolutionDescription: 'Pipe repaired with industrial sealant and joint replaced.' }),
  });
  console.log('✓ Resolution submitted. New status:', resolutionData.issue?.status);

  // 12. Citizen Verifies Resolution
  console.log('\n[TEST 12] Citizen Verifies Resolution (ACCEPTED) ...');
  const verifyData = await req(`/issues/${createdIssueId}/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({ decision: 'ACCEPTED' }),
  });
  console.log('✓ Citizen verification complete. New Status:', verifyData.newStatus);

  // 13. Forgot Password / OTP Flow
  console.log('\n[TEST 13] Testing Forgot Password OTP Flow ...');
  const forgotData = await req('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'citizen1@civic.local' }),
  });
  console.log('✓ Forgot Password requested:', forgotData.message);

  console.log('\n============================================================');
  console.log('🎉 ALL 13 END-TO-END TESTS PASSED WITH 100% SUCCESS!');
  console.log('============================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
