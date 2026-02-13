#!/bin/bash
# debug.sh

node -e "
const http = require('http');
const req = http.get('http://localhost:3013/debug?command=$1&target=$2&option=$3', (res) => {
    console.log('Status:', res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Response:', data));
});
req.on('error', (e) => console.error('Error:', e.message));
"
