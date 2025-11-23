# n8n + HubSpot + WATI Integration Setup Guide

This guide walks you through configuring your existing n8n workflow to sync Haven7 users to HubSpot and send WhatsApp onboarding messages via WATI.

## Prerequisites

- Access to your n8n workflow: https://yzpubzyxjubarraaix.app.n8n.cloud/workflow/rXWQMXk3Wgqc2e5T
- HubSpot account with Private App Access Token
- WATI account with API credentials
- Haven7 application with environment variables configured

---

## PART 1: Access Your n8n Workflow

1. Open your n8n workflow: https://yzpubzyxjubarraaix.app.n8n.cloud/workflow/rXWQMXk3Wgqc2e5T
2. You should see your workflow canvas
3. If the workflow is not active, click the **Active** toggle in the top-right to activate it

---

## PART 2: Configure Webhook Trigger

**Goal:** Set up the entry point that receives data from Haven7.

### Steps:

1. **Check if Webhook node exists:**
   - Look for a **Webhook** node in your workflow
   - If it doesn't exist, click **+** and search for **Webhook**

2. **Configure Webhook node:**
   - **HTTP Method:** POST
   - **Path:** Leave blank (n8n will auto-generate)
   - **Authentication:** None (for now)

3. **Copy Production URL:**
   - Click on the Webhook node
   - Copy the **Production URL** (looks like: `https://yzpubzyxjubarraaix.app.n8n.cloud/webhook/abc123`)
   - This is the URL you'll add to your Haven7 `.env.local` file as `VITE_N8N_WEBHOOK_URL`

4. **Test the webhook:**
   - Click **Listen for Test Event** in the webhook node
   - Keep this tab open
   - Use Postman/Thunder Client/curl to send a test POST request:
     ```json
     {
       "email": "test@haven7.com",
       "user_id": "test-123",
       "sources_connected": 0,
       "onboarding_stage": "New User"
     }
     ```
   - You should see the data appear in the webhook node
   - Click **Execute Node** to see the output

---

## PART 3: Configure HubSpot Node

**Goal:** Create or update HubSpot contacts when users sign up.

### Steps:

1. **Add HubSpot node:**
   - Click **+** after the Webhook node
   - Search for **HubSpot**
   - Add the HubSpot node

2. **Connect HubSpot credentials:**
   - Click **Create New Credential** or select existing
   - Enter your **HubSpot Private App Access Token** (starts with `pat-...`)
   - Save credentials

3. **Configure HubSpot node:**
   - **Resource:** Contact
   - **Operation:** Create or Update
   - **Email field:**
     - Click the field dropdown
     - Switch to **Expression** tab
     - Enter: `{{ $json.email }}`
   - **Additional Properties:**
     - Click **Add Field**
     - **Property Name:** `sources_connected` (or your custom property name)
     - **Value:** `{{ $json.sources_connected }}`
     - Click **Add Field** again
     - **Property Name:** `onboarding_stage` (or your custom property name)
     - **Value:** `{{ $json.onboarding_stage }}`
     - Click **Add Field** again
     - **Property Name:** `haven7_user_id` (or your custom property name)
     - **Value:** `{{ $json.user_id }}`

4. **Important:** 
   - Make sure these custom properties exist in HubSpot with **exact matching internal names**
   - Go to HubSpot → Settings → Properties → Contact Properties
   - Create properties if they don't exist:
     - `sources_connected` (Number)
     - `onboarding_stage` (Text)
     - `haven7_user_id` (Text)

---

## PART 4: Configure WATI WhatsApp Node

**Goal:** Send WhatsApp onboarding messages after HubSpot sync.

### Steps:

1. **Get WATI credentials:**
   - Visit https://wati.io
   - Sign in to your account
   - Go to **API Settings** or **API Docs**
   - Copy:
     - **WATI Base URL** (e.g., `https://live-server-XXXXX.wati.io`)
     - **WATI Access Token**

2. **Add HTTP Request node:**
   - Click **+** after the HubSpot node
   - Search for **HTTP Request**
   - Add the HTTP Request node

3. **Configure HTTP Request node:**
   - **Method:** POST
   - **URL:** 
     ```
     https://live-server-XXXXX.wati.io/api/v1/sendSessionMessage/{{ $json.phone_number }}
     ```
     - Replace `XXXXX` with your WATI server ID
     - Note: You'll need to add `phone_number` to the webhook payload if not already included
   - **Authentication:** Generic Credential Type
     - **Header Name:** `Authorization`
     - **Header Value:** `Bearer YOUR_WATI_ACCESS_TOKEN`
   - **Body Content Type:** JSON
   - **Body Parameters:**
     - `messageText`: `Welcome to Haven7! Connect your first source to start searching.`

4. **Alternative:** If you don't have phone numbers in the payload:
   - You can skip the phone number in the URL and use a static number
   - Or add a phone number field to your Haven7 signup form
   - Or use WATI's template message API if available

---

## PART 5: Test the Workflow

**Goal:** Verify everything works end-to-end.

### Steps:

1. **Execute workflow manually:**
   - Click **Execute Workflow** button
   - Or click **Execute Node** on each node sequentially

2. **Send test data:**
   - Use Postman/Thunder Client/curl to POST to your webhook URL:
     ```json
     {
       "email": "test@haven7.com",
       "user_id": "test-123",
       "sources_connected": 0,
       "onboarding_stage": "New User",
       "phone_number": "+1234567890"
     }
     ```

3. **Verify results:**
   - Check n8n **Executions** tab → Should show successful execution
   - Check HubSpot → Contacts → Should see new contact with custom properties
   - Check WhatsApp → Should receive message (if phone number was provided)

---

## PART 6: Activate Workflow

**Goal:** Make the workflow live so it processes real requests.

### Steps:

1. **Save workflow:**
   - Click **Save** button (top-right)

2. **Activate workflow:**
   - Toggle **Active** switch to ON (top-right)
   - Workflow is now live and will process incoming webhooks

3. **Copy webhook URL:**
   - Click on Webhook node
   - Copy the **Production URL**
   - Add it to your Haven7 `.env.local` file:
     ```
     VITE_N8N_WEBHOOK_URL=https://yzpubzyxjubarraaix.app.n8n.cloud/webhook/your-actual-path
     ```

---

## PART 7: Configure Haven7 Environment

**Goal:** Connect Haven7 to your n8n workflow.

### Steps:

1. **Add environment variable:**
   - Open `.env.local` file in Haven7 project root
   - Add:
     ```
     VITE_N8N_WEBHOOK_URL=https://yzpubzyxjubarraaix.app.n8n.cloud/webhook/your-actual-path
     ```
   - Replace `your-actual-path` with the actual path from your n8n webhook node

2. **Restart development server:**
   - Stop your dev server (Ctrl+C)
   - Start it again: `npm run dev` or `yarn dev`

---

## PART 8: End-to-End Test

**Goal:** Verify the complete flow works with real user signup.

### Steps:

1. **Sign up a new user in Haven7:**
   - Go to your Haven7 app
   - Sign up with a test email
   - Complete the signup process

2. **Check n8n:**
   - Go to n8n → **Executions** tab
   - You should see a new execution triggered by the signup
   - Check that all nodes executed successfully (green checkmarks)

3. **Check HubSpot:**
   - Go to HubSpot → Contacts
   - Find the contact with the test email
   - Verify custom properties are populated:
     - `sources_connected`: 0
     - `onboarding_stage`: "New User"
     - `haven7_user_id`: (the user's UUID)

4. **Check WhatsApp:**
   - If phone number was provided, check WhatsApp for the onboarding message

---

## Troubleshooting

### Webhook not receiving data:
- Check that `VITE_N8N_WEBHOOK_URL` is set correctly in `.env.local`
- Verify the webhook URL in n8n matches what's in your env file
- Check browser console for errors when signup happens
- Ensure workflow is **Active** in n8n

### HubSpot contact not created:
- Verify HubSpot credentials are correct
- Check that custom properties exist in HubSpot with exact names
- Check n8n execution logs for HubSpot node errors
- Verify the email field mapping is correct

### WhatsApp message not sent:
- Verify WATI credentials are correct
- Check that phone number is in the payload (if required)
- Check WATI API documentation for correct endpoint format
- Verify Authorization header format: `Bearer TOKEN`

### Workflow execution fails:
- Check n8n **Executions** tab for error details
- Verify all nodes are properly connected
- Check that all required fields are mapped correctly
- Review n8n execution logs for specific error messages

---

## Webhook Payload Structure

Haven7 sends the following JSON payload to n8n:

```json
{
  "email": "user@example.com",
  "user_id": "uuid-from-supabase",
  "sources_connected": 0,
  "onboarding_stage": "New User"
}
```

### Field Descriptions:
- `email`: User's email address
- `user_id`: Supabase user UUID
- `sources_connected`: Number of connected sources (0 for new users)
- `onboarding_stage`: Current onboarding stage ("New User", "Onboarding", or "Active User")

---

## Next Steps

- Monitor n8n executions regularly to ensure workflow is running smoothly
- Consider adding error handling nodes in n8n for failed webhook calls
- Set up notifications in n8n for workflow failures
- Add more fields to the webhook payload as needed (e.g., phone number, name)
- Update HubSpot custom properties as your onboarding flow evolves

---

## Support

If you encounter issues:
1. Check n8n execution logs
2. Review Haven7 browser console for errors
3. Verify all environment variables are set correctly
4. Check HubSpot and WATI API documentation for any changes

