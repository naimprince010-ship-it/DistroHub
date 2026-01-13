/**
 * Quick Production Fix Verification Script
 * 
 * Run this AFTER redeploying backend and frontend
 * 
 * Instructions:
 * 1. Go to: https://distrohub-frontend.vercel.app/accountability
 * 2. Login as Admin
 * 3. Open DevTools (F12) → Console
 * 4. Copy and paste this entire script
 * 5. Press Enter
 * 6. Check the output
 */

(async function verifyProductionFix() {
  console.log('🔍 Verifying Production Fix...\n');
  
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ Please login first');
    return;
  }
  
  const apiBaseUrl = 'https://distrohub-backend.onrender.com'; // Update if different
  
  try {
    // Get SR "Jahid Islam"
    console.log('Step 1: Finding SR "Jahid Islam"...');
    const usersResponse = await fetch(`${apiBaseUrl}/api/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!usersResponse.ok) {
      throw new Error(`Failed to fetch users: ${usersResponse.status}`);
    }
    
    const users = await usersResponse.json();
    const jahid = users.find(u => u.role === 'sales_rep' && u.name.toLowerCase().includes('jahid'));
    
    if (!jahid) {
      console.error('❌ SR "Jahid Islam" not found');
      console.log('Available SRs:', users.filter(u => u.role === 'sales_rep').map(u => u.name));
      return;
    }
    
    console.log(`✅ Found SR: ${jahid.name} (${jahid.id})\n`);
    
    // Get accountability data
    console.log('Step 2: Fetching accountability data...');
    const accResponse = await fetch(`${apiBaseUrl}/api/users/${jahid.id}/accountability`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!accResponse.ok) {
      throw new Error(`Failed to fetch accountability: ${accResponse.status}`);
    }
    
    const data = await accResponse.json();
    
    console.log('\n📊 Accountability Data:\n');
    console.log('Full Response:', JSON.stringify(data, null, 2));
    
    // Critical checks
    console.log('\n--- Critical Checks ---');
    
    const hasTotalCollected = data.total_collected !== undefined;
    const hasTotalReturns = data.total_returns !== undefined;
    
    console.log(`${hasTotalCollected ? '✅' : '❌'} total_collected field: ${hasTotalCollected ? 'EXISTS' : 'MISSING'}`);
    console.log(`${hasTotalReturns ? '✅' : '❌'} total_returns field: ${hasTotalReturns ? 'EXISTS' : 'MISSING'}`);
    
    if (!hasTotalCollected || !hasTotalReturns) {
      console.error('\n❌ BACKEND NOT DEPLOYED!');
      console.error('   → Backend is missing new fields');
      console.error('   → Action: Redeploy backend (Render/Railway)');
      return;
    }
    
    // Value checks
    console.log('\n--- Value Checks ---');
    console.log(`Total Expected Cash: ৳${(data.total_expected_cash || 0).toLocaleString()}`);
    console.log(`Total Collected:     ৳${(data.total_collected || 0).toLocaleString()} ${data.total_collected === 0 ? '⚠️ ZERO' : '✅'}`);
    console.log(`Total Returns:       ৳${(data.total_returns || 0).toLocaleString()}`);
    console.log(`Current Outstanding: ৳${(data.current_outstanding || 0).toLocaleString()}`);
    
    // Calculation check
    const expectedOutstanding = (data.total_expected_cash || 0) - (data.total_collected || 0) - (data.total_returns || 0);
    const actualOutstanding = data.current_outstanding || 0;
    const calcMatch = Math.abs(expectedOutstanding - actualOutstanding) < 0.01;
    
    console.log('\n--- Calculation Check ---');
    console.log(`Expected Outstanding: ৳${expectedOutstanding.toLocaleString()}`);
    console.log(`Actual Outstanding:   ৳${actualOutstanding.toLocaleString()}`);
    console.log(`Calculation Match: ${calcMatch ? '✅' : '❌'}`);
    
    // Final verdict
    console.log('\n--- Final Verdict ---');
    
    if (hasTotalCollected && hasTotalReturns) {
      console.log('✅ Backend is DEPLOYED with latest fix');
      
      if (data.total_collected === 0 && data.total_expected_cash > 0) {
        console.log('⚠️ WARNING: Total Collected is 0 but Total Expected > 0');
        console.log('   Possible causes:');
        console.log('   1. Payment route_id is NULL (run backfill)');
        console.log('   2. Payments not linked to routes');
        console.log('   3. Route status issue');
        console.log('\n   Action: Check payment route_id values in database');
      } else if (data.total_collected > 0) {
        console.log('✅ Total Collected has correct value');
        console.log('✅ Backend calculation is working');
      }
    } else {
      console.error('❌ Backend is NOT DEPLOYED with latest fix');
      console.error('   Action: Redeploy backend immediately');
    }
    
    // Frontend check
    console.log('\n--- Frontend Check ---');
    console.log('To verify frontend:');
    console.log('1. Go to Sources tab (DevTools)');
    console.log('2. Navigate to: webpack:// → ./src/pages/Accountability.tsx');
    console.log('3. Check line ~202:');
    console.log('   ✅ Should show: accountability.total_collected.toLocaleString()');
    console.log('   ❌ If shows: accountability.reconciliations.reduce(...) → Frontend not deployed');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.error('Error:', error.message);
    
    if (error.message.includes('401')) {
      console.error('   → Authentication failed. Please login again.');
    } else if (error.message.includes('Failed to fetch')) {
      console.error('   → Network error. Check backend URL and CORS settings.');
    }
  }
  
  console.log('\n✅ Verification complete!');
})();
