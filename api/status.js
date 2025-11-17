// api/status.js (支援管理後台與前台)

import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: '不支援的請求方法' });
    }

    try {
        const { eventId } = request.query;
        const secret = request.headers.authorization?.split(' ')[1];
        const isAdmin = secret === process.env.ADMIN_SECRET;

        // 管理員模式：回傳所有活動列表
        if (isAdmin && !eventId) {
            const eventIds = await kv.lrange('events_index', 0, -1);
            if (!eventIds || eventIds.length === 0) {
                return response.status(200).json([]);
            }

            const events = [];
            for (const id of eventIds) {
                const config = await kv.get(`event:${id}:config`);
                if (config) {
                    events.push(config);
                }
            }
            return response.status(200).json(events);
        }

        // 單一活動模式
        if (!eventId || typeof eventId !== 'string') {
            return response.status(400).json({ error: '缺少有效的活動 ID。' });
        }

        const data = await kv.get(`event:${eventId}:data`);
        
        // 如果是管理員，回傳完整資料
        if (isAdmin) {
            // 處理兩種資料格式：陣列（未抽籤）或物件（已抽籤）
            let participants = [];
            let drawCompleted = false;
            let emailsSent = false;

            if (Array.isArray(data)) {
                participants = data;
            } else if (data && typeof data === 'object') {
                participants = data.participants || [];
                drawCompleted = data.draw_completed || false;
                emailsSent = data.emails_sent || false;
            }

            const groupStatus = participants.reduce((acc, p) => {
                acc[p.group_id] = (acc[p.group_id] || 0) + 1;
                return acc;
            }, {});

            return response.status(200).json({
                count: participants.length,
                groupStatus: groupStatus,
                participants: participants,
                draw_completed: drawCompleted,
                emails_sent: emailsSent,
            });
        }

        // 前台使用者：只回傳基本統計
        const participants = Array.isArray(data) ? data : [];
        const groupStatus = participants.reduce((acc, p) => {
            acc[p.group_id] = (acc[p.group_id] || 0) + 1;
            return acc;
        }, {});

        return response.status(200).json({
            count: participants.length,
            groupStatus: groupStatus,
        });

    } catch (error) {
        console.error("Status API Error:", error);
        return response.status(500).json({ error: '伺服器內部錯誤，無法獲取活動狀態。' });
    }
}
