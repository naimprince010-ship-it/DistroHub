# Category API Testing Guide

## Prerequisites

1. **Start the Backend Server**
   ```bash
   cd distrohub-backend
   # Activate your virtual environment if you have one
   uvicorn app.main:app --reload --port 8000
   ```

2. **Start the Frontend Server**
   ```bash
   cd distrohub-frontend
   npm run dev
   ```

## Testing Methods

### Method 1: Browser Console Testing (Recommended)

1. Open your browser and navigate to the Settings page (Categories tab)
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Run the following test script:

```javascript
// Test Category API
async function testCategoryAPI() {
  const API_URL = 'http://localhost:8000';
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No token found. Please login first.');
    return;
  }

  console.log('=== CATEGORY API TEST ===');
  console.log('Token:', token.substring(0, 20) + '...');

  // Step 1: Get existing categories
  console.log('\n[1] Fetching existing categories...');
  try {
    const getResponse = await fetch(`${API_URL}/api/categories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const categories = await getResponse.json();
    console.log('✓ Successfully fetched categories:', categories.length);
    console.log('Categories:', categories);
  } catch (error) {
    console.error('✗ Failed to fetch categories:', error);
    return;
  }

  // Step 2: Create a new category
  console.log('\n[2] Creating a new test category...');
  const testCategory = {
    name: `Test Category ${new Date().toISOString()}`,
    description: 'This is a test category created via API',
    color: '#10B981'
  };
  console.log('Creating:', testCategory);

  try {
    const createResponse = await fetch(`${API_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCategory)
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(JSON.stringify(error));
    }

    const createdCategory = await createResponse.json();
    console.log('✓ Category created successfully!');
    console.log('Created Category:', createdCategory);
    const categoryId = createdCategory.id;

    // Step 3: Verify it was saved by fetching again
    console.log('\n[3] Verifying persistence - fetching all categories again...');
    const verifyResponse = await fetch(`${API_URL}/api/categories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const allCategories = await verifyResponse.json();
    const foundCategory = allCategories.find(c => c.id === categoryId);
    
    if (foundCategory) {
      console.log('✓ Category persists in database!');
      console.log('Found category:', foundCategory);
      console.log('\n=== TEST PASSED ===');
      console.log('Category ID:', categoryId);
      console.log('Total categories:', allCategories.length);
    } else {
      console.error('✗ Category NOT found in database!');
      console.log('All categories:', allCategories);
      console.log('\n=== TEST FAILED ===');
    }

    return { categoryId, createdCategory, allCategories };
  } catch (error) {
    console.error('✗ Failed to create category:', error);
    console.error('Error details:', error.message);
    return null;
  }
}

// Run the test
testCategoryAPI();
```

### Method 2: Python Test Script

1. Make sure the backend server is running on port 8000
2. Run the test script:
   ```bash
   python test_category_api.py
   ```

### Method 3: Manual UI Testing with Console Logs

1. Open the browser console (F12)
2. Navigate to Settings > Categories
3. Watch the console for logs starting with `[CategoryManagement]`
4. Click "Add Category"
5. Fill in the form and submit
6. Check the console logs to see:
   - `[CategoryManagement] Submitting category:` - Shows the payload
   - `[CategoryManagement] Category created successfully:` - Shows the response
   - `[CategoryManagement] Refreshing categories list...` - Confirms refresh
   - `[CategoryManagement] Categories fetched successfully:` - Shows updated list

## Expected Console Output

When adding a category through the UI, you should see:

```
[CategoryManagement] Component mounted, fetching categories...
[CategoryManagement] Fetching categories from API...
[CategoryManagement] Categories fetched successfully: [...]
[CategoryManagement] Number of categories: X

// When you click "Add Category" and submit:
[CategoryManagement] Submitting category: {isEdit: false, payload: {...}}
[CategoryManagement] Creating category via POST: /api/categories
[CategoryManagement] Category created successfully: {id: "...", name: "...", ...}
[CategoryManagement] New category ID: "abc12345"
[CategoryManagement] Refreshing categories list...
[CategoryManagement] Fetching categories from API...
[CategoryManagement] Categories fetched successfully: [...]
[CategoryManagement] Number of categories: X+1
[CategoryManagement] Category operation completed successfully
```

## Troubleshooting

### Issue: "Failed to fetch categories"
- Check if backend server is running on port 8000
- Check if you're logged in (token exists in localStorage)
- Check browser Network tab for API request details

### Issue: "Failed to save category"
- Check the error response in console
- Verify the API endpoint is correct
- Check if the request payload matches the expected format

### Issue: Category appears but disappears on refresh
- Check if `fetchCategories()` is being called on component mount
- Verify the API response includes the new category
- Check browser Network tab to see if GET request returns the category

## Verification Checklist

- [ ] Backend server is running
- [ ] Frontend server is running
- [ ] User is logged in
- [ ] Console shows `[CategoryManagement] Component mounted`
- [ ] Console shows successful API calls
- [ ] Network tab shows 200 status for POST and GET requests
- [ ] Category appears in UI after creation
- [ ] Category persists after page refresh

