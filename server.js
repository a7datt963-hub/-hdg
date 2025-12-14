// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' })); // زيادة الحد لاستقبال صور كبيرة إن لزم
app.use(express.static('public')); // يخدم index.html لو وضعت فيه

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getSheetsClient() {
  // GOOGLE_PRIVATE_KEY يجب أن يكون مخزناً في .env مع \n للأسطر
  if (!process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error('اخفق تحميل بيانات حساب الخدمة من المتغيرات البيئية.');
  }
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  const jwt = new google.auth.JWT(
    clientEmail,
    null,
    privateKey,
    SCOPES
  );
  return google.sheets({ version: 'v4', auth: jwt });
}

app.post('/api/products', async (req, res) => {
  try {
    const { name, barcode, quantity, buying, sale, description, barcodeImageBase64 } = req.body;

    // تحقق بسيط
    if (!name || !barcode) {
      return res.status(400).json({ error: 'name and barcode are required' });
    }

    // صفّ البيانات على شكل [A:name, B:barcode, C:amount, D:buying, E:sale, F:description]
    const values = [
      [
        name || '',
        barcode || '',
        quantity != null ? String(quantity) : '',
        buying != null ? String(buying) : '',
        sale != null ? String(sale) : '',
        description || ''
      ]
    ];

    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:F',
      valueInputOption: 'RAW',
      requestBody: { values }
    });

    // اختياري: لو تريد تخزين صورة الباركود محليًا أو إلى تخزين سحابي، يمكن إضافته هنا.
    // حالياً نكتفي بإرسال التأكيد فقط
    return res.json({ ok: true, message: 'row appended' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
