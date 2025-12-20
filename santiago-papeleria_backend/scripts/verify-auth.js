const axios = require('axios');

const API_URL = 'http://localhost:3000/api/usuarios';
const EMAIL = `test_${Date.now()}@example.com`;
const PASSWORD = 'Password123!';
const NEW_PASSWORD = 'NewPassword123!';

async function runTests() {
    console.log('>>> Starting Auth Integration Tests <<<\n');

    try {
        // 1. Register
        console.log(`1. Registering user: ${EMAIL}...`);
        const regRes = await axios.post(`${API_URL}/register`, {
            name: 'Test User',
            email: EMAIL,
            password: PASSWORD,
            client_type: 'MINORISTA'
        });
        console.log('   ✅ Register success:', regRes.data.message);

        // Manual Step: Need token
        console.log('\n!!! MANUAL STEP !!!');
        console.log('   Please check the backend console for `[TESTING] Verification Token`.');
        console.log('   Enter the token below:');

        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const verifyToken = await new Promise(resolve => {
            readline.question('   Token: ', (t) => {
                resolve(t.trim());
            });
        });

        // 2. Verify Email
        console.log(`\n2. Verifying Email with token: ${verifyToken}...`);
        try {
            const verifyRes = await axios.get(`${API_URL}/verify-email?token=${verifyToken}`);
            console.log('   ✅ Verification success. Access Token received:', !!verifyRes.data.access_token);
        } catch (e) {
            console.error('   ❌ Verification failed:', e.response?.data || e.message);
            process.exit(1);
        }

        // 3. Verify Reuse (Should FAIL)
        console.log('\n3. Testing Token Reuse (Should FAIL)...');
        try {
            await axios.get(`${API_URL}/verify-email?token=${verifyToken}`);
            console.error('   ❌ Token Reuse succeeded (Unexpected)');
        } catch (e) {
            if (e.response && e.response.status === 400) {
                console.log('   ✅ Token Reuse rejected (400 Bad Request) as expected.');
            } else {
                console.error('   ❌ Unexpected error:', e.response?.status, e.response?.data);
            }
        }

        // 4. Forgot Password
        console.log('\n4. Requesting Password Reset...');
        await axios.post(`${API_URL}/forgot-password`, { email: EMAIL });
        console.log('   ✅ Forgot Password request sent.');

        console.log('\n!!! MANUAL STEP !!!');
        console.log('   Check console for `[TESTING] Reset Token`.');
        console.log('   Enter Reset Token:');

        const resetToken = await new Promise(resolve => {
            readline.question('   Token: ', (t) => {
                resolve(t.trim());
            });
        });

        // 5. Reset Password
        console.log(`\n5. Resetting Password with token: ${resetToken}...`);
        await axios.post(`${API_URL}/reset-password`, {
            token: resetToken,
            newPassword: NEW_PASSWORD
        });
        console.log('   ✅ Password Reset success.');

        // 6. Login with OLD Password (Should FAIL)
        console.log('\n6. Login with OLD Password (Should FAIL)...');
        try {
            await axios.post(`${API_URL}/login`, { email: EMAIL, password: PASSWORD });
            console.error('   ❌ Login with OLD password succeeded (Unexpected)');
        } catch (e) {
            if (e.response && e.response.status === 401) {
                console.log('   ✅ Login with OLD password failed (401) as expected.');
            } else {
                console.error('   ❌ Unexpected error:', e.response?.status);
            }
        }

        // 7. Login with NEW Password (Should SUCCEED)
        console.log('\n7. Login with NEW Password (Should SUCCEED)...');
        try {
            const loginRes = await axios.post(`${API_URL}/login`, { email: EMAIL, password: NEW_PASSWORD });
            console.log('   ✅ Login with NEW password success. Token:', !!loginRes.data.access_token);
        } catch (e) {
            console.error('   ❌ Login with NEW password failed:', e.response?.data || e.message);
        }

        console.log('\n>>> All Tests Completed <<<');
        readline.close();

    } catch (err) {
        console.error('Global Error:', err.message);
    }
}

runTests();
