// api/delete-event.js (新檔案)

import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    // 安全性檢查
    if (request.method !== 'POST') return response.status(405).end();
    const secret = request.headers.authorization?.split(' ')[1];
    if (secret !== process.env.ADMIN_SECRET) return response.status(401).end();

    try {
        const { eventId } = request.body;
        if (!eventId) {
            return response.status(400).json({ message: '必須提供活動 ID。' });
        }

        // 使用 KV multi() 來確保操作的原子性
        const pipe = kv.multi();

        // 1. 刪除活動的設定
        pipe.del(`event:${eventId}:config`);
        // 2. 刪除活動的參與者資料
        pipe.del(`event:${eventId}:data`);
        // 3. 從全域索引列表中移除該活動 ID
        // LREM 語法: LREM key count value (從列表中移除 value)
        pipe.lrem('events_index', 0, eventId);

        await pipe.exec();

        return response.status(200).json({ message: `活動 ${eventId} 已被徹底刪除！` });

    } catch (error) {
        console.error("Delete Event API Error:", error);
        return response.status(500).json({ message: '刪除活動時發生錯誤。' });
    }
}