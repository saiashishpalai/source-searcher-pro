// Simple test to check what's failing in the server
console.log('Testing server imports...');

try {
  console.log('1. Testing dotenv...');
  const dotenv = await import('dotenv');
  console.log('✅ dotenv imported successfully');
} catch (error) {
  console.error('❌ dotenv failed:', error.message);
}

try {
  console.log('2. Testing express...');
  const express = await import('express');
  console.log('✅ express imported successfully');
} catch (error) {
  console.error('❌ express failed:', error.message);
}

try {
  console.log('3. Testing cors...');
  const cors = await import('cors');
  console.log('✅ cors imported successfully');
} catch (error) {
  console.error('❌ cors failed:', error.message);
}

try {
  console.log('4. Testing supabase...');
  const { createClient } = await import('@supabase/supabase-js');
  console.log('✅ supabase imported successfully');
} catch (error) {
  console.error('❌ supabase failed:', error.message);
}

console.log('Test completed');
