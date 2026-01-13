/**
 * Production API Verification Script
 * 
 * Run this in browser console on https://distrohub-frontend.vercel.app
 * 
 * Instructions:
 * 1. Open https://distrohub-frontend.vercel.app/accountability
 * 2. Open DevTools (F12) → Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Check the output
 */

(async function verifyProductionAPI() {
  console.log('🔍 Starting Production API Verification...\n');
  
  // Get auth token from localStorage
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  if (!token) {
    console.error('❌ No auth token found. Please login first.');
    return;
  }
  
  // Get API base URL from the frontend's axios instance or use default
  // Try to get it from window or use the default production URL
  let apiBaseUrl = 'https://distrohub-backend.onrender.com'; // Default production backend
  
  // Try to detect from axios instance if available
  if (window.axios && window.axios.defaults && window.axios.defaults.baseURL) {
    apiBaseUrl = window.axios.defaults.baseURL;
  } else {
    // Check console logs for API URL (frontend logs it on load)
    console.log('💡 Tip: Check browser console for "[API] API URL:" to see the actual backend URL');
  }
  
  console.log('📡 API Base URL:', apiBaseUrl);
  console.log('🔑 Auth Token:', token.substring(0, 20) + '...\n');
  
  try {
    // Step 1: Get all users to find SR IDs
    console.log('Step 1: Fetching users...');
    const usersResponse = await fetch(`${apiBaseUrl}/api/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!usersResponse.ok) {
      throw new Error(`Users API failed: ${usersResponse.status} ${usersResponse.statusText}`);
    }
    
    const users = await usersResponse.json();
    const srUsers = users.filter(u => u.role === 'sales_rep');
    console.log(`✅ Found ${srUsers.length} SR users\n`);
    
    if (srUsers.length === 0) {
      console.error('❌ No SR users found');
      return;
    }
    
    // Step 2: Test accountability endpoint for first SR
    const testSR = srUsers[0];
    console.log(`Step 2: Testing accountability for SR: ${testSR.name} (${testSR.id})\n`);
    
    const accountabilityResponse = await fetch(`${apiBaseUrl}/api/users/${testSR.id}/accountability`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!accountabilityResponse.ok) {
      throw new Error(`Accountability API failed: ${accountabilityResponse.status} ${accountabilityResponse.statusText}`);
    }
    
    const accountability = await accountabilityResponse.json();
    
    // Step 3: Verify response structure
    console.log('📊 API Response Analysis:\n');
    console.log('Full Response:', accountability);
    console.log('\n--- Field Verification ---');
    
    const checks = {
      'user_id': accountability.user_id !== undefined,
      'user_name': accountability.user_name !== undefined,
      'current_cash_holding': accountability.current_cash_holding !== undefined,
      'current_outstanding': accountability.current_outstanding !== undefined,
      'total_expected_cash': accountability.total_expected_cash !== undefined,
      'total_collected': accountability.total_collected !== undefined, // ✅ CRITICAL
      'total_returns': accountability.total_returns !== undefined,     // ✅ CRITICAL
      'routes': Array.isArray(accountability.routes),
      'reconciliations': Array.isArray(accountability.reconciliations)
    };
    
    Object.entries(checks).forEach(([field, exists]) => {
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${field}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
    console.log('\n--- Value Verification ---');
    console.log(`Total Expected Cash: ৳${accountability.total_expected_cash?.toLocaleString() || 'N/A'}`);
    console.log(`Total Collected:     ৳${accountability.total_collected?.toLocaleString() || 'N/A'} ${accountability.total_collected === undefined ? '❌ MISSING' : accountability.total_collected === 0 ? '⚠️ ZERO' : '✅'}`);
    console.log(`Total Returns:       ৳${accountability.total_returns?.toLocaleString() || 'N/A'} ${accountability.total_returns === undefined ? '❌ MISSING' : '✅'}`);
    console.log(`Current Outstanding: ৳${accountability.current_outstanding?.toLocaleString() || 'N/A'}`);
    
    // Step 4: Verify calculation
    console.log('\n--- Calculation Verification ---');
    if (accountability.total_collected !== undefined && 
        accountability.total_returns !== undefined && 
        accountability.total_expected_cash !== undefined) {
      const expectedOutstanding = accountability.total_expected_cash - accountability.total_collected - accountability.total_returns;
      const actualOutstanding = accountability.current_outstanding || 0;
      const calculationMatch = Math.abs(expectedOutstanding - actualOutstanding) < 0.01;
      
      console.log(`Expected Outstanding: ৳${expectedOutstanding.toLocaleString()}`);
      console.log(`Actual Outstanding:  ৳${actualOutstanding.toLocaleString()}`);
      console.log(`Calculation Match: ${calculationMatch ? '✅' : '❌'}`);
      
      if (!calculationMatch) {
        console.warn('⚠️ Outstanding calculation mismatch!');
      }
    } else {
      console.warn('⚠️ Cannot verify calculation - missing required fields');
    }
    
    // Step 5: Check routes and payments
    console.log('\n--- Route & Payment Analysis ---');
    console.log(`Active Routes: ${accountability.active_routes_count || 0}`);
    console.log(`Pending Reconciliation: ${accountability.pending_reconciliation_count || 0}`);
    console.log(`Total Routes: ${accountability.routes?.length || 0}`);
    console.log(`Total Reconciliations: ${accountability.reconciliations?.length || 0}`);
    
    // Step 6: Final verdict
    console.log('\n--- Final Verdict ---');
    const hasTotalCollected = accountability.total_collected !== undefined;
    const hasTotalReturns = accountability.total_returns !== undefined;
    
    if (hasTotalCollected && hasTotalReturns) {
      console.log('✅ Backend is DEPLOYED with latest fix');
      console.log('✅ API response includes total_collected and total_returns');
      
      if (accountability.total_collected === 0) {
        console.log('⚠️ Total Collected is 0 - This might be correct if:');
        console.log('   - No payments recorded yet');
        console.log('   - Payments exist but route_id is NULL (run backfill)');
        console.log('   - Route is reconciled but no payments (check reconciliation totals)');
      } else {
        console.log('✅ Total Collected has value - Backend calculation working');
      }
    } else {
      console.error('❌ Backend is NOT DEPLOYED with latest fix');
      console.error('❌ Missing fields in API response');
      console.error('   Action: Trigger backend redeploy');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.error('Error details:', error.message);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('   → Authentication failed. Please login again.');
    } else if (error.message.includes('404')) {
      console.error('   → Endpoint not found. Check backend URL.');
    } else if (error.message.includes('Failed to fetch')) {
      console.error('   → Network error. Check backend is running and CORS is configured.');
    }
  }
  
  console.log('\n✅ Verification complete!');
})();
