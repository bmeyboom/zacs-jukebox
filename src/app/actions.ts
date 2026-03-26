"use server"; 

import { google } from 'googleapis'; 

export async function getLatestSong() {
    try {
        // 1. Setup the "Handshake" with google
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, 
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // 2. Fetch the data (assumes Song column is A, user column is B)
        const response = await sheets.spreadsheets.values.get({
            spreadsheetID: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A:B',
        });

        const rows = response.data.values; 

        if (!rows || rows.length == 0) {
            return { song: "No songs found", user: "System"};
        }

        // 3. Grab the very last row (the most recent addition)
        const lastRow = rows[rows.length - 1]; 

        return {
            song: lastRow[0], // Column A 
            user: lastRow[1], // Column B 
        }
    } catch (error) {
        console.error("Google Sheets Error:", error); 
        return { song: "Error fetching song", user: "System"}; 
    }
}