// api/status.js (多活動支援版)

import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'GET') return response.status(405).end();
    const secret = request.headers.authorization?.split(' ')[1];
    if (secret !== process.env.ADMIN_SECRET) return response.status(401).end();

    try {
        const { eventId } = request.query;

        if (eventId) {
            // --- 模式二：獲取單一活動的詳細資料 ---
            const eventData = await kv.get(`event:${eventId}:data`);
            
            if (eventData === null) {
                return response.status(404).json({ message: '找不到指定的活動資料。' });
            }
            
            // 與舊版邏輯類似，整理回傳資料
            const participants = Array.isArray(eventData) ? eventData : eventData.participants || [];
            const isDrawn = !Array.isArray(eventData) && eventData.draw_completed;
            const emailsSent = !Array.isArray(eventData) && eventData.emails_sent;

            return response.status(200).json({
                draw_completed: isDrawn,
                emails_sent: emailsSent,
                count: participants.length,
                participants: participants,
            });

        } else {
            // --- 模式一：獲取所有活動的列表 ---
            const eventIds = await kv.lrange('events_index', 0, -1);
            if (!eventIds || eventIds.length === 0) {
                return response.status(200).json([]); // 回傳空陣列表示沒有活動
            }

            // 為每一個 eventId 去取得它的 config
            // 注意：如果活動很多，這裡可以優化，但對於少量活動是OK的
            const eventConfigs = await kv.mget(...eventIds.map(id => `event:${id}:config`));
            
            // 過濾掉可能為 null 的結果 (如果 config 意外被刪除)
            const validConfigs = eventConfigs.filter(config => config !== null);

            return response.status(200).json(validConfigs);
        }

    } catch (error) {
        console.error("Status API Error:", error);
        return response.status(500).json({ message: '獲取狀態時發生錯誤。' });
    }
}