/**
 * Script to create custom properties in HubSpot via API
 * Run this once to create the properties, then use them in n8n
 */

const HUBSPOT_API_KEY = 'f08aede8-f016-466c-bdd4-725c8f283756'; // Your Client Secret

const properties = [
  {
    name: 'haven7_user_id',
    label: 'Haven7 User ID',
    type: 'string',
    fieldType: 'text'
  },
  {
    name: 'sources_connected',
    label: 'Sources Connected',
    type: 'number',
    fieldType: 'number'
  },
  {
    name: 'onboarding_stage',
    label: 'Onboarding Stage',
    type: 'string',
    fieldType: 'text'
  }
];

async function createProperty(property) {
  const url = `https://api.hubapi.com/crm/v3/properties/contacts`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`
    },
    body: JSON.stringify(property)
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log(`✅ Created property: ${property.name}`);
    return data;
  } else {
    if (data.message?.includes('already exists')) {
      console.log(`⚠️  Property ${property.name} already exists`);
      return data;
    }
    console.error(`❌ Failed to create ${property.name}:`, data);
    throw new Error(data.message || 'Unknown error');
  }
}

async function createAllProperties() {
  console.log('🚀 Creating HubSpot custom properties...\n');
  
  for (const property of properties) {
    try {
      await createProperty(property);
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
    } catch (error) {
      console.error(`Failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ Done! Properties are ready to use in n8n.');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAllProperties();
}

export { createAllProperties, createProperty };

