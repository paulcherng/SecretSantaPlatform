// api/create-event.js

import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid'; // 我們需要一個函式庫來產生獨特的 ID

export default async function handler(request, response) {
    // 安全性檢查
    if (request.method !== 'POST') return response.status(405).end();
    const secret = request.headers.authorization?.split(' ')[1];
    if (secret !== process.env.ADMIN_SECRET) return response.status(401).end();

    try {
        const { eventName, giftAmount, submissionDeadline, groups } = request.body;

        // 簡單的輸入驗證
        if (!eventName || !groups || !Array.isArray(groups) || groups.length === 0) {
            return response.status(400).json({ message: '活動名稱和組別設定為必填。' });
        }

        // 產生一個獨特的活動 ID (例如: evt_a1b2c3d4e5)
        const eventId = `evt_${nanoid(10)}`;

        // 準備要儲存的活動設定
        const eventConfig = {
            id: eventId,
            eventName: eventName.trim(),
            giftAmount: giftAmount || '未設定',
            submissionDeadline: submissionDeadline || null,
            groups: groups, // 期待的格式: [{ id: 1, name: "組名", limit: 2 }, ...]
            createdAt: new Date().toISOString(),
        };

        // 準備要儲存的活動參與者資料 (初始為空)
        const eventData = [];

        // 使用 KV 的 multi() 功能來確保所有操作都成功，或都不成功 (原子操作)
        const pipe = kv.multi();
        // 1. 儲存活動設定
        pipe.set(`event:${eventId}:config`, eventConfig);
        // 2. 初始化活動參與者資料
        pipe.set(`event:${eventId}:data`, eventData);
        // 3. 將新活動 ID 加入到全域索引中
        pipe.lpush('events_index', eventId);
        
        await pipe.exec();

        return response.status(201).json({ 
            message: '活動已成功建立！',
            event: eventConfig 
        });

    } catch (error) {
        console.error("Create Event API Error:", error);
        return response.status(500).json({ message: '建立活動時發生錯誤。' });
    }
}