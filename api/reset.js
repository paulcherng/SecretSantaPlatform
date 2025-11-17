// api/reset.js (指定活動重置版)

import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'POST') return response.status(405).end();
    const secret = request.headers.authorization?.split(' ')[1];
    if (secret !== process.env.ADMIN_SECRET) return response.status(401).end();

    try {
        const { eventId } = request.body;
        if (!eventId) {
            return response.status(400).json({ message: '必須提供活動 ID。' });
        }

        // 檢查活動是否存在 (可選但更安全)
        const configExists = await kv.exists(`event:${eventId}:config`);
        if (!configExists) {
            return response.status(404).json({ message: '找不到要重置的活動。' });
        }

        // 只重置該活動的 "data"，將其設回空陣列
        await kv.set(`event:${eventId}:data`, []);

        return response.status(200).json({ message: `活動 ${eventId} 的參與者資料已成功清空！` });

    } catch (error) {
        console.error("Reset API Error:", error);
        return response.status(500).json({ message: '重置活動時發生錯誤。' });
    }
}