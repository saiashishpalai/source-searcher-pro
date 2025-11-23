# WATI WhatsApp Integration Guide for n8n

Complete guide to integrating WATI (WhatsApp API) with n8n workflows for sending automated WhatsApp messages.

---

## What is WATI?

WATI (WhatsApp Team Inbox) is a WhatsApp Business API platform that allows you to:
- Send automated WhatsApp messages
- Receive and respond to WhatsApp messages
- Build chatbots and automated workflows
- Integrate with CRM systems (like HubSpot)

---

## PART 1: Get WATI Account & Credentials

### Step 1: Sign Up for WATI
1. Go to: https://wati.io
2. Click **"Sign Up"** or **"Start Free Trial"**
3. Create your account
4. Verify your email

### Step 2: Connect Your WhatsApp Number

**⚠️ Important:** Once a WhatsApp number is connected to WATI, it **cannot be used** in the regular WhatsApp app. The number is dedicated to WATI for business messaging.

**Options for Testing:**

1. **Use WATI Test/Sandbox Environment** (Recommended for Testing)
   - WATI often provides a test number or sandbox environment
   - Check WATI dashboard → **Settings** → **Test Numbers** or **Sandbox**
   - This allows testing without connecting your personal number

2. **Use a Secondary Phone Number**
   - Use a spare/secondary phone number you don't use for personal WhatsApp
   - Or use a family member's number (with permission) for testing only

3. **Use a Virtual Number Service**
   - Services like **Twilio**, **Vonage**, or **TextNow** provide virtual numbers
   - These can be used for testing WATI integration
   - Cost: Usually $1-5/month for a virtual number

4. **WATI Free Trial/Test Account**
   - Some WATI plans include a test number
   - Check your WATI plan details or contact support

**For Production:**
- Use a dedicated business phone number
- Consider getting a separate SIM card/number for business use

**Steps to Connect:**
1. In WATI dashboard, go to **Settings** → **WhatsApp Numbers**
2. Click **"Add Number"** or **"Connect WhatsApp"**
3. Follow the QR code scan process (like connecting WhatsApp Web)
4. Your number will be connected and removed from regular WhatsApp

### Step 3: Get API Credentials
1. Go to **Settings** → **API** or **API Settings**
2. You'll see:
   - **API Endpoint** (Base URL): `https://live-server-XXXXX.wati.io`
     - Note the `XXXXX` part - this is your server ID
   - **API Token** (Access Token): `Bearer xxxxx-xxxxx-xxxxx`
     - Copy this token (starts with letters/numbers, not "Bearer")

---

## PART 2: Understanding WATI API

### WATI API Endpoints (Common Ones):

1. **Send Session Message** (to a specific WhatsApp number):
   ```
   POST https://live-server-XXXXX.wati.io/api/v1/sendSessionMessage/{phone_number}
   ```
   - `{phone_number}` = WhatsApp number in format: `1234567890` (no +, no spaces)
   - Example: `https://live-server-abc123.wati.io/api/v1/sendSessionMessage/1234567890`

2. **Send Template Message** (for approved templates):
   ```
   POST https://live-server-XXXXX.wati.io/api/v1/sendTemplateMessage
   ```

3. **Get Contact Info**:
   ```
   GET https://live-server-XXXXX.wati.io/api/v1/getContact/{phone_number}
   ```

### Authentication:
- **Header:** `Authorization: Bearer YOUR_ACCESS_TOKEN`
- **Content-Type:** `application/json`

### Request Body Format:
```json
{
  "messageText": "Your message here"
}
```

---

## PART 3: Add WATI to n8n Workflow

### Step 1: Add HTTP Request Node
1. In your n8n workflow, click **+** after the HubSpot node
2. Search for **"HTTP Request"**
3. Add the HTTP Request node

### Step 2: Configure HTTP Request Node

**Basic Settings:**
- **Method:** `POST`
- **URL:** 
  ```
  https://live-server-XXXXX.wati.io/api/v1/sendSessionMessage/{{ $json.phone_number }}
  ```
  - Replace `XXXXX` with your WATI server ID
  - `{{ $json.phone_number }}` pulls phone from webhook data

**Authentication:**
1. Click **"Authentication"** dropdown
2. Select **"Generic Credential Type"** or **"Header Auth"**
3. **Header Name:** `Authorization`
4. **Header Value:** `Bearer YOUR_WATI_ACCESS_TOKEN`
   - Replace `YOUR_WATI_ACCESS_TOKEN` with your actual token

**Body:**
1. **Body Content Type:** `JSON`
2. **Body Parameters:**
   - Click **"Add Parameter"**
   - **Name:** `messageText`
   - **Value:** `Welcome to Haven7! 🎉 Connect your first source to start searching.`
     - Or use expression: `{{ "Welcome " + $json.email + "! Connect your first source." }}`

### Step 3: Handle Phone Number Format

**Important:** WATI requires phone numbers in format: `1234567890` (no +, no spaces, no dashes)

Add a Code node before WATI to format the phone number:

```javascript
// Format phone number for WATI
const phone = $json.phone_number || $json.phone;

// Remove +, spaces, dashes, parentheses
const formattedPhone = phone.replace(/[\+\s\-\(\)]/g, '');

return {
  json: {
    ...$json,
    phone_number: formattedPhone
  }
};
```

---

## PART 4: Common WATI Use Cases

### Use Case 1: Send Welcome Message After Signup
**Flow:** User signs up → HubSpot contact created → Send WhatsApp welcome

**Message Example:**
```
Welcome to Haven7! 🎉

Your account is ready. Connect your first source to start searching:
- Google Drive
- Slack
- Notion

Get started: https://haven7.com/connect-sources
```

### Use Case 2: Send Interview Reminder
**Flow:** Interview scheduled → Send reminder 1 hour before

**Message Example:**
```
Hi {{ $json.candidate_name }}!

Reminder: Your interview with {{ $json.company_name }} is in 1 hour.

Meeting Link: {{ $json.meeting_url }}

See you soon! 🚀
```

### Use Case 3: Send Status Updates
**Flow:** Application status changes → Notify candidate via WhatsApp

**Message Example:**
```
Hi {{ $json.name }},

Your application status has been updated to: {{ $json.status }}

{{ $json.message }}

Best regards,
{{ $json.company_name }} Team
```

---

## PART 5: Advanced WATI Features

### 1. Send Media (Images/Documents)
```json
{
  "media": {
    "url": "https://example.com/image.jpg",
    "filename": "welcome.jpg"
  },
  "messageText": "Check out this image!"
}
```

### 2. Send Buttons/Interactive Messages
```json
{
  "messageText": "Choose an option:",
  "buttons": [
    {
      "text": "Option 1",
      "value": "option1"
    },
    {
      "text": "Option 2", 
      "value": "option2"
    }
  ]
}
```

### 3. Use Templates (For Business Accounts)
- Create templates in WATI dashboard
- Use template ID instead of messageText
- Better deliverability for business messages

---

## PART 6: Error Handling

### Common Errors:

1. **401 Unauthorized**
   - Check your API token is correct
   - Make sure token starts with correct format

2. **404 Not Found**
   - Check phone number format (no +, no spaces)
   - Verify WATI server ID is correct

3. **400 Bad Request**
   - Check message format
   - Verify phone number is valid WhatsApp number

### Add Error Handling in n8n:
1. Add **IF node** after HTTP Request
2. Check if response status is 200
3. If error → Log to error tracking or send alert

---

## PART 7: Testing WATI Integration

### ⚠️ Testing Without a Dedicated Number

**Problem:** You need a WhatsApp number to test, but don't want to disconnect your personal number.

**Solutions:**

1. **Use WATI Test Environment** (Best Option)
   - WATI provides test numbers in their dashboard
   - Go to **Settings** → **Test Numbers** or contact WATI support
   - These numbers work for testing but may have limitations

2. **Use a Temporary/Virtual Number**
   - **TextNow** (Free): Get a free virtual number for testing
   - **Google Voice** (Free): Get a free US number
   - **Twilio** ($1/month): Professional virtual numbers
   - **Vonage** (Pay-as-you-go): Virtual numbers for testing
   
   **Steps:**
   - Sign up for one of these services
   - Get a virtual number
   - Use that number to connect to WATI
   - Test your integration
   - You can disconnect later if needed

3. **Test with Mock/Simulated Responses**
   - Test the n8n workflow without actually sending WhatsApp
   - Use n8n's "Test Workflow" feature
   - Verify the API call structure is correct
   - Check response format matches expectations

4. **Use a Friend's Number (Temporary)**
   - Ask a friend/colleague if you can use their number for testing
   - Connect it to WATI temporarily
   - Test your integration
   - Disconnect after testing (they can reconnect to regular WhatsApp)

### Test 1: Manual Test
1. In n8n, click **"Execute step"** on HTTP Request node
2. Set mock data:
   ```json
   {
     "phone_number": "1234567890",
     "email": "test@example.com"
   }
   ```
   - Replace `1234567890` with your test number (no +, no dashes)
3. Check OUTPUT → Should see success response
4. Check your WhatsApp → Should receive message

### Test 2: End-to-End Test
1. Sign up a new user in Haven7 (with phone number in format: `+XX-XXXXXXXXXX`)
2. Check n8n Executions → Should show all nodes executed
3. Check WhatsApp → Should receive welcome message

### Test 3: Verify Without Sending (Dry Run)
1. In n8n, add a **Code node** before WATI node
2. Log the formatted phone number and message
3. Execute workflow to verify data flow
4. Remove Code node when ready to send actual messages

---

## PART 8: Best Practices

### 1. Phone Number Collection
- Add phone number field to signup form
- Validate format before sending to n8n
- Store in database for future use

### 2. Message Personalization
- Use expressions: `{{ $json.name }}`
- Include dynamic content from webhook
- Make messages conversational

### 3. Rate Limiting
- WATI has rate limits (check your plan)
- Add delays between messages if sending bulk
- Use WATI's batch API for multiple messages

### 4. Opt-in/Opt-out
- Always get user consent before sending WhatsApp
- Provide opt-out option in messages
- Respect WhatsApp Business Policy

---

## PART 9: Interview Talking Points

When discussing WATI integration in interviews, mention:

1. **API Integration:**
   - "I integrated WATI WhatsApp API with n8n using HTTP Request nodes"
   - "Used REST API with Bearer token authentication"

2. **Data Flow:**
   - "User signup → Webhook → n8n → Format data → Send to HubSpot → Send WhatsApp"

3. **Error Handling:**
   - "Implemented error handling for API failures"
   - "Added phone number formatting and validation"

4. **Scalability:**
   - "Designed workflow to handle multiple users simultaneously"
   - "Used n8n's built-in retry mechanisms"

5. **Best Practices:**
   - "Followed WhatsApp Business Policy guidelines"
   - "Implemented opt-in/opt-out mechanisms"

---

## Quick Reference

### WATI API Endpoint:
```
POST https://live-server-{SERVER_ID}.wati.io/api/v1/sendSessionMessage/{PHONE_NUMBER}
```

### Headers:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

### Body:
```json
{
  "messageText": "Your message here"
}
```

### Phone Number Format:
- ✅ Correct: `1234567890`
- ❌ Wrong: `+1234567890`, `123-456-7890`, `(123) 456-7890`

---

## Resources

- WATI Documentation: https://docs.wati.io
- WATI API Reference: https://docs.wati.io/reference
- WhatsApp Business Policy: https://www.whatsapp.com/legal/business-policy

---

## Troubleshooting

**Q: Messages not sending?**
- Check phone number format (no +, no spaces)
- Verify API token is correct
- Check WATI account status

**Q: Getting 401 errors?**
- Regenerate API token in WATI dashboard
- Make sure token includes "Bearer " prefix in header

**Q: Phone number not found?**
- Number must be registered WhatsApp number
- User must have your number saved (for some WATI plans)

---

This guide covers everything you need to know about WATI integration for your interview! 🚀

