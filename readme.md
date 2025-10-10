# Halloween Costume Contest - Setup Instructions (Apps Script Version)

## Files You Have
1. **index.html** - Main voting page (for guests)
2. **admin.html** - Admin results page (password-protected)

## Google Apps Script Setup (10 minutes)

### Step 1: Create a Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it something like "Halloween Contest Votes"
4. In the first row (header), add these column names:
   - A1: `Timestamp`
   - B1: `Funniest`
   - C1: `Most Creative`
   - D1: `Least Effort`

### Step 2: Create the Apps Script
1. In your Google Sheet, go to **Extensions** → **Apps Script**
2. Delete any code in the editor
3. Copy and paste this entire script:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    const timestamp = new Date();
    const funniest = data.funniest || '';
    const creative = data.creative || '';
    const leastEffort = data.leastEffort || '';
    
    sheet.appendRow([timestamp, funniest, creative, leastEffort]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    // Skip header row
    const votes = data.slice(1).map(row => ({
      timestamp: row[0],
      funniest: row[1],
      creative: row[2],
      leastEffort: row[3]
    }));
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      votes: votes
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Click **Save** (disk icon)
5. Name your project something like "Halloween Vote Handler"

### Step 3: Deploy as Web App
1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Fill in the settings:
   - **Description**: "Halloween voting system"
   - **Execute as**: **Me** (your email)
   - **Who has access**: **Anyone** (important!)
5. Click **Deploy**
6. Click **Authorize access**
7. Choose your Google account
8. Click **Advanced** → **Go to [your project name] (unsafe)**
9. Click **Allow**
10. **Copy the Web app URL** - it will look like:
    ```
    https://script.google.com/macros/s/AKfycby.../exec
    ```
11. Click **Done**

### Step 4: Configure Your HTML Files

#### In `index.html`:
Find this line near the top of the `<script>` section:
```javascript
const SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
```
Replace with your actual Web app URL from Step 3.

#### In `admin.html`:
Find these lines near the top of the `<script>` section:
```javascript
const ADMIN_PASSWORD = 'admin123';
const SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
```
Replace:
- `admin123` with your desired admin password
- The SCRIPT_URL with your actual Web app URL

## Deploy to GitHub Pages

### Option 1: GitHub Web Interface
1. Go to your GitHub account
2. Create a new repository (e.g., "halloween-contest")
3. Make it public
4. Upload `index.html` and `admin.html`
5. Go to Settings → Pages
6. Under "Source", select your main branch
7. Click Save
8. Your site will be live at: `https://yourusername.github.io/halloween-contest/`

### Option 2: Git Command Line
```bash
git init
git add index.html admin.html
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/halloween-contest.git
git push -u origin main
```
Then enable GitHub Pages in repository settings.

## Testing

### Test 1: Submit a vote
1. Open `index.html` (or your GitHub Pages URL)
2. Fill out all three categories
3. Click Submit
4. Check your Google Sheet - you should see a new row with timestamp and votes!
5. Try voting again - it should say you already voted

### Test 2: View admin results
1. Open `admin.html`
2. Enter your admin password
3. You should see the votes tallied by category
4. Click refresh to see live updates

## Troubleshooting

### "Error submitting vote"
**Check the browser console (F12 → Console tab) for errors:**

- **"Failed to fetch"** or **CORS error**: 
  - Make sure you deployed the Apps Script as "Anyone" can access
  - Try redeploying: Deploy → Manage deployments → Edit → New version → Deploy

- **No error but votes don't appear**:
  - Check your Google Sheet directly
  - Make sure the Apps Script is saved
  - Verify the Web app URL is correct (it should end with `/exec`)

### "Error loading results" on admin page
- Same troubleshooting as above
- Verify the sheet has the correct column headers
- Check browser console for specific error messages

### Admin password not working
- Password is case-sensitive
- Make sure you changed it in `admin.html` and saved the file
- Clear your browser cache

### Votes appearing with wrong data
- Make sure your sheet columns are in the correct order:
  - Column A: Timestamp
  - Column B: Funniest
  - Column C: Most Creative  
  - Column D: Least Effort

## Important Notes

✅ **Much more secure** than API keys - your script controls access  
✅ **Free forever** - Apps Script has generous free quotas  
✅ **No API keys to leak** - the script URL can only read/write to your sheet  
⚠️ Anyone with the script URL can submit votes (but that's the point!)  
⚠️ Duplicate vote prevention still relies on browser localStorage (honor system)

## Making Updates After Deployment

If you need to change the Apps Script code:
1. Edit the code in the Apps Script editor
2. Save it
3. Go to **Deploy** → **Manage deployments**
4. Click the pencil icon ✏️ to edit
5. Change "Version" to **New version**
6. Click **Deploy**
7. The URL stays the same, but your changes are live!

## After the Event

**To close voting:**
1. Go to your Apps Script
2. Go to **Deploy** → **Manage deployments**  
3. Click **Archive** next to your deployment
4. Or just take down your GitHub Pages site

**To download results:**
- Your votes are in the Google Sheet
- File → Download → CSV or Excel

## Security Notes

- ✅ Your Apps Script runs with YOUR permissions
- ✅ Only reads/writes to the specific sheet you created it in
- ✅ Can't access your other Google Drive files
- ✅ The script URL is hard to guess (long random string)
- ✅ Even if someone finds it, they can only submit votes or read results (which is fine!)

Good luck with your Halloween contest! 🎃