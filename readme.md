# Halloween Costume Contest - Setup Instructions

## Files You Have
1. **index.html** - Main voting page (for guests)
2. **admin.html** - Admin results page (password-protected)

## Google Sheets API Setup (10 minutes)

### Step 1: Create a Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it something like "Halloween Contest Votes"
4. In the first row (header), add these column names:
   - A1: `Timestamp`
   - B1: `Funniest`
   - C1: `Most Creative`
   - D1: `Least Effort`
5. Rename the sheet tab at the bottom to `Votes` (important!)
6. Copy the **Sheet ID** from the URL. It's the long string between `/d/` and `/edit`:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
   ```

### Step 2: Create Google Cloud Project & API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Click "Enable APIs and Services"
4. Search for "Google Sheets API" and enable it
5. Go to "Credentials" in the left sidebar
6. Click "Create Credentials" → "API Key"
7. Copy your API key
8. **IMPORTANT:** Click "Edit API key" and restrict it:
   - Under "API restrictions", select "Restrict key"
   - Select only "Google Sheets API"
   - Under "Website restrictions", add your GitHub Pages URL (optional but recommended)
9. Save

### Step 3: Make Sheet Writable by API
1. Go back to your Google Sheet
2. Click the "Share" button (top right)
3. Click "Change to anyone with the link"
4. Set permission to "Editor"
5. Click "Done"

**Note:** This makes your sheet publicly editable via the API, but only people with the API key can write to it. Don't share your API key!

## Configure Your Files

### In `index.html`:
Find these lines near the top of the `<script>` section (around line 145):
```javascript
const API_KEY = 'YOUR_GOOGLE_API_KEY_HERE';
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
```
Replace with your actual values.

### In `admin.html`:
Find these lines near the top of the `<script>` section (around line 185):
```javascript
const ADMIN_PASSWORD = 'admin123';
const API_KEY = 'YOUR_GOOGLE_API_KEY_HERE';
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
```
Replace:
- `admin123` with your desired admin password
- The API key and Sheet ID with your actual values

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

1. **Test voting**: Open `index.html` (or your GitHub Pages URL)
   - Fill out all three categories
   - Submit the form
   - Check your Google Sheet - you should see a new row!
   - Try voting again - it should say you already voted

2. **Test admin**: Open `admin.html`
   - Enter your admin password
   - You should see the results tallied by category

## How It Works

**For Voters:**
- They visit your site, enter three costume names (one per category)
- When they click Submit, the votes are sent to your Google Sheet
- Their browser remembers they voted (via localStorage)
- They can't vote again unless they use private/incognito mode

**For You (Admin):**
- Visit `/admin.html`, enter your password
- See all votes tallied and sorted by count
- Click refresh to see live updates
- The data stays in your Google Sheet for your records

## Privacy & Security Notes

- ✅ Voters never see results
- ✅ API key is restricted to Sheets API only
- ✅ Admin page is password-protected
- ⚠️ Anyone with API key could technically write to your sheet (don't share it!)
- ⚠️ Voters can bypass the duplicate-vote check with private browsing (honor system)
- ⚠️ Google Sheet is publicly editable but requires the API key

## Troubleshooting

**"Failed to submit vote"**
- Check that your API key is correct
- Verify the Sheet ID is correct
- Make sure the sheet is set to "Anyone with link can edit"
- Check browser console (F12) for detailed errors

**"Failed to fetch data" on admin page**
- Same as above
- Also verify the sheet tab is named exactly `Votes`

**Votes aren't showing up**
- Check your Google Sheet directly
- Make sure column headers match exactly (case-sensitive)

**Admin password not working**
- Check that you changed it in `admin.html`
- Password is case-sensitive

## Tips

- Share only the main voting URL with guests (not the admin.html URL)
- Check the Google Sheet periodically to see votes coming in
- After the contest, you can download the sheet as a CSV for records
- You can close voting by taking the site down or modifying the code

Good luck with your Halloween contest! 🎃