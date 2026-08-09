const fs = require('fs');
const path = require('path');

async function testPg() {
  console.log('Testing pg package availability...');
  try {
    const { Client } = require('pg');
    console.log('pg package is available!');
  } catch (err) {
    console.log('pg package is not installed:', err.message);
  }
}

testPg().catch(console.error);
