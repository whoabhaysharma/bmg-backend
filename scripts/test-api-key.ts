import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api'; // Adjust port if needed

async function main() {
    console.log('--- Setting up Test API Key ---');
    const key = 'test-api-key-' + Date.now();

    try {
        const apiKey = await prisma.apiKey.create({
            data: {
                key: key,
                name: 'Test Script Key',
                isActive: true
            }
        });
        console.log(`Created API Key: ${key}`);

        console.log('\n--- Testing API Access ---');
        try {
            const response = await axios.get(`${API_URL}/gyms`, {
                headers: {
                    'x-api-key': key
                }
            });
            console.log('Status:', response.status);
            console.log('Data count:', response.data.data ? response.data.data.length : 'N/A');
            console.log('SUCCESS: API Key authentication worked!');
        } catch (error: any) {
            console.error('FAILED: API Request failed');
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            } else {
                console.error('Error:', error.message);
            }
        }

        // Cleanup
        await prisma.apiKey.delete({ where: { id: apiKey.id } });
        console.log('\n--- Cleanup Done ---');

    } catch (error) {
        console.error('Script Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
